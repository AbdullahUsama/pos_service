# Khappa POS - Next-Generation Point of Sale & Inventory Management System

**Khappa POS** is a modern, full-featured Point of Sale and Inventory Management solution designed to streamline sales operations, maintain precise stock control, and provide deep, real-time business analytics. Built with Next.js and backed by a robust Supabase database, it features dual panels for cashiers and administrators, ensuring security, speed, and responsiveness on any device.

---

## ✨ Key Features

### 1. Dual Panel Architecture

| Panel | Primary Users | Key Responsibilities |
| :--- | :--- | :--- |
| **Cashier Panel** | Cashiers, Sales Staff | Fast transaction processing, product search, cart management, and payment handling (Cash/Transfer). |
| **Admin Panel** | Managers, Owners | Inventory control, sales reporting, analytics, and user management. |

### Cashier Panel (dark)
<img width="1910" height="866" alt="image" src="https://github.com/user-attachments/assets/4e3cdd82-48d4-4145-b330-facace204192" />

### Cashier Panel (light)
<img width="1900" height="859" alt="image" src="https://github.com/user-attachments/assets/7ca5a84c-12b4-408a-844b-15838dcf7e5b" />


### 2. Comprehensive Inventory Management (Admin)

<img width="1902" height="773" alt="image" src="https://github.com/user-attachments/assets/91396b8f-24c0-4f23-9233-4ad545d2384d" />

<img width="1888" height="851" alt="image" src="https://github.com/user-attachments/assets/1e7862c4-e34a-418c-a9bb-481c712d9beb" />


* **Item Management:** Easily add new items with original price, selling price, and total quantity.
* **Real-Time Stock:** View current stock levels instantly (e.g., Stock: 95).
* **Editing & Deletion:** Quick inline editing and deletion of existing inventory items.

### 3. Advanced Sales Reporting & Analytics (Admin)

<img width="1875" height="863" alt="image" src="https://github.com/user-attachments/assets/6fac87e7-b9ae-4604-9a5f-7262640e2ae2" />

### Filtering Options
<img width="1858" height="616" alt="image" src="https://github.com/user-attachments/assets/a20195dc-6440-4ba1-92c3-5eb6ff9ac698" />

### Deep Analytics
<img width="1870" height="757" alt="image" src="https://github.com/user-attachments/assets/31c6e21f-1645-4f5a-a90a-186910ae04bf" />
<img width="1857" height="601" alt="image" src="https://github.com/user-attachments/assets/7892446d-25af-45ad-ab38-a1e98f9565ec" />

<img width="1876" height="605" alt="image" src="https://github.com/user-attachments/assets/e1a7b980-5983-4c46-84c4-9e50991da79b" />

<img width="1859" height="605" alt="image" src="https://github.com/user-attachments/assets/e80f1030-45c9-4d73-8d4d-838d2e7f5a6d" />


**Reporting:**

* **Metrics:** Real-time metrics including **Total Revenue**, **Transactions**, **Today's Sales**, and **Today's Profit**.
* **Transactions Log:** Detailed transaction history including Date/Time, Cashier, Amount, Payment Method, and a breakdown of Items sold.

<img width="1906" height="698" alt="image" src="https://github.com/user-attachments/assets/b8e5e39a-e586-4a1d-b9e6-08275c550782" />


**Filtering:**

* **General Search:** Search by payment method, items, etc.
* **Cashier Specific:** Filter reports by individual Cashier Name.
* **Time Period:** Flexible filtering by date range (Start Date/End Date).

**Analytics (Powered by Chart.js):**

* **Sales by Cashier**
* **Products by Quantity (Top 10)**
* **Sales Trend Over Time**
* **Payment Methods Distribution**
* **Daily Profit Trend**
* **Profit Breakdown by Product**
* **Top Revenue Items**
* **Additional Insights**

### 4. Robust Data Integrity & Backup

* **Primary DB:** Uses **Supabase (PostgreSQL)** for reliable, scalable, and secure primary data storage.
* **Live Logging/Backup:** Every transaction is **logged live to a linked Google Sheet** which acts as a real-time, redundant backup, ensuring maximum data safety and accessibility for non-technical users.

### 5. Usability & Aesthetics

* **Themed Modes:** Supports both **Light Mode** and a sleek **Dark Mode**.
* **Mobile Responsive:** Beautiful, adaptive design optimized for seamless use on desktop, tablet, and mobile devices.

<img width="345" height="754" alt="image" src="https://github.com/user-attachments/assets/a1ec6c08-af86-469d-9640-5522aa0ec719" />
<img width="352" height="760" alt="image" src="https://github.com/user-attachments/assets/d087c194-8ad7-4fa1-8b6f-5e0e15e644bb" />
<img width="347" height="763" alt="image" src="https://github.com/user-attachments/assets/daec405a-d5c5-494b-9f3c-e210df2a08a7" />
<img width="335" height="756" alt="image" src="https://github.com/user-attachments/assets/50761846-35c7-497a-b4e1-7b66be466a17" />


## 👤 Cashier Management

The Admin panel includes a dedicated section for **Cashier Management**, allowing administrators to:

* **Add New Cashiers:** Register new user accounts via Supabase Auth.
* **Remove Cashiers:** Deactivate or delete user accounts.

<img width="1228" height="678" alt="image" src="https://github.com/user-attachments/assets/0f8062c8-373e-4229-aa41-eb5b53863039" />

---

## 🛠 Technology Stack

* **Frontend Framework:** Next.js
* **Styling:** Modern, responsive CSS/Utility Framework (e.g., Tailwind CSS)
* **Database & Auth:** Supabase (PostgreSQL & Authentication)
* **Analytics:** Chart.js
* **Data Backup:** Google Sheets API

---
