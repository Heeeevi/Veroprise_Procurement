import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, UserPlus, Shield } from 'lucide-react';
import type { AppRole } from '@/types/database';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AppRole | null;
  created_at: string;
}

export default function Users() {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get profiles with their roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profiles) {
        // Get roles for each user
        const usersWithRoles: UserWithRole[] = await Promise.all(
          profiles.map(async (profile: any) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.user_id)
              .single();

            return {
              id: profile.id,
              user_id: profile.user_id,
              full_name: profile.full_name,
              email: profile.user_id, // We don't have email in profiles, using user_id as placeholder
              phone: profile.phone,
              role: roleData?.role as AppRole | null,
              created_at: profile.created_at,
            };
          })
        );

        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    try {
      // Check if user already has a role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .single();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: selectedRole })
          .eq('user_id', selectedUser.user_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: selectedRole });

        if (error) throw error;
      }

      toast({ title: 'Berhasil', description: 'Role berhasil diupdate' });
      setShowRoleDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Role berhasil dihapus' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-primary">Owner</Badge>;
      case 'manager':
        return <Badge className="bg-info">Manager</Badge>;
      case 'staff':
        return <Badge className="bg-accent text-accent-foreground">Staff</Badge>;
      case 'investor':
        return <Badge variant="outline">Investor</Badge>;
      default:
        return <Badge variant="secondary">No Role</Badge>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Manajemen Pengguna</h1>
            <p className="text-muted-foreground">Kelola user dan role akses</p>
          </div>
        </div>

        <Card className="card-warm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="font-display">Daftar Pengguna</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRole(user.role || 'staff');
                            setShowRoleDialog(true);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        {user.role && user.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleRemoveRole(user.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Role Assignment Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Assign role untuk: <strong>{selectedUser?.full_name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner - Akses penuh</SelectItem>
                  <SelectItem value="manager">Manager - Kelola outlet</SelectItem>
                  <SelectItem value="staff">Staff - POS & input data</SelectItem>
                  <SelectItem value="investor">Investor - Lihat laporan saja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Batal</Button>
            <Button onClick={handleAssignRole}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
