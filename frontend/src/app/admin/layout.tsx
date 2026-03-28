import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import AdminHeader from '@/components/Admin/AdminHeader';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Admin Panel - StarkEd Education',
  description: 'Administrative interface for StarkEd platform management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <div className="flex">
              <AdminSidebar />
              <div className="flex-1">
                <AdminHeader />
                <main className="p-6">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
