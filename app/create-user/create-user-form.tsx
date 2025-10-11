"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export default function CreateUserForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'cashier'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`User created successfully! Email: ${data.user.email}, Role: ${data.user.role}`);
        setFormData({ email: '', password: '', role: 'cashier' });
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email" className="text-gray-300">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          placeholder="user@example.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="password" className="text-gray-300">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          placeholder="Enter password"
          required
          minLength={6}
        />
      </div>

      <div>
        <Label htmlFor="role" className="text-gray-300">Role</Label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="cashier">Cashier</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? 'Creating User...' : 'Create User'}
      </Button>

      {message && (
        <div className="p-3 bg-green-800 text-green-200 rounded-lg text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-800 text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="text-center pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/auth/login')}
          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
        >
          Back to Login
        </Button>
      </div>
    </form>
  );
}