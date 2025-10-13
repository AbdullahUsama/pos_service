import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import googleSheetsService from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const { userId, totalAmount, paymentMethod, cartDetails } = await request.json();

    if (!userId || !totalAmount || !paymentMethod || !cartDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // First, validate that all items with quantity tracking have enough stock
    for (const cartItem of cartDetails) {
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('quantity, name')
        .eq('id', cartItem.id)
        .single();

      if (itemError) {
        console.error('Error validating item stock:', itemError);
        return NextResponse.json(
          { error: `Could not validate stock for ${cartItem.name}` },
          { status: 400 }
        );
      }

      // Check if item has quantity tracking and sufficient stock
      if (itemData?.quantity !== null && itemData?.quantity !== undefined) {
        if (itemData.quantity < cartItem.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${itemData.name}. Available: ${itemData.quantity}, Requested: ${cartItem.quantity}` },
            { status: 400 }
          );
        }
      }
    }

    // Record the sale
    const { data: saleData, error: salesError } = await supabase
      .from('sales')
      .insert({
        cashier_id: userId,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        cart_details: cartDetails
      })
      .select()
      .single();

    if (salesError) {
      console.error('Error recording sale:', salesError);
      return NextResponse.json(
        { error: 'Failed to record sale' },
        { status: 500 }
      );
    }

    // Update inventory quantities for items that have quantity tracking
    const inventoryUpdates = [];
    for (const cartItem of cartDetails) {
      // Get current item data to check if it has quantity tracking
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('quantity')
        .eq('id', cartItem.id)
        .single();

      if (itemError) {
        console.error('Error fetching item for quantity update:', itemError);
        continue;
      }

      // Only update if item has quantity tracking (not null)
      if (itemData?.quantity !== null && itemData?.quantity !== undefined) {
        const newQuantity = Math.max(0, itemData.quantity - cartItem.quantity);
        
        const { error: updateError } = await supabase
          .from('items')
          .update({ quantity: newQuantity })
          .eq('id', cartItem.id);

        if (updateError) {
          console.error('Error updating item quantity:', updateError);
          inventoryUpdates.push({
            item: cartItem.name,
            success: false,
            error: updateError.message
          });
        } else {
          inventoryUpdates.push({
            item: cartItem.name,
            success: true,
            oldQuantity: itemData.quantity,
            newQuantity
          });
        }
      }
    }

    // Get cashier email for Google Sheets logging
    let cashierEmail = 'Unknown';
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (!userError && userData?.user?.email) {
        cashierEmail = userData.user.email;
      }
    } catch (emailError) {
      console.log('Could not fetch cashier email:', emailError);
    }

    // Log to Google Sheets asynchronously (don't block the response)
    const saleForSheets = {
      id: saleData.id,
      created_at: saleData.created_at,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      items: cartDetails,
      cashier_email: cashierEmail,
      customer_name: '', // Add if you have customer info
      discount: 0, // Add if you have discount info
      tax: 0, // Add if you have tax info
      notes: '' // Add if you have notes
    };

    // Don't await this - let it run in background
    googleSheetsService.appendSaleData(saleForSheets).catch(error => {
      console.error('Failed to log to Google Sheets:', error);
    });

    return NextResponse.json({
      success: true,
      saleId: saleData.id,
      inventoryUpdates,
      message: 'Sale processed successfully'
    });

  } catch (error) {
    console.error('Error processing sale:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}