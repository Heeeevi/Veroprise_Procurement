import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, UserPlus, Shield, Key, Mail, AlertTriangle, Building2, MapPin, Store } from 'lucide-react';
import type { AppRole, LegacyRole, ProcurementRole } from '@/types/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ManagedRole = ProcurementRole;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const authClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

interface Outlet {
  id: string;
  name: string;
  address: string | null;
}

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AppRole | null;
  created_at: string;
  outlets: Outlet[];
}

export default function Users() {
  const { isOwner, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showOutletDialog, setShowOutletDialog] = useState(false);
  const [showAddOutletDialog, setShowAddOutletDialog] = useState(false);
  const [showEditOutletDialog, setShowEditOutletDialog] = useState(false);
  const [showDeleteOutletDialog, setShowDeleteOutletDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<ManagedRole>('gudang');
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    new_password: '',
  });

  // Add user form
  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'gudang' as ManagedRole,
    outlet_id: '',
  });

  // Outlet form
  const [outletForm, setOutletForm] = useState({
    name: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('id, name, address')
        .order('name');

      if (error) throw error;
      setOutlets(data || []);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Get all profiles (role is in profiles table now)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get user_outlets assignments
      const { data: userOutlets, error: userOutletsError } = await supabase
        .from('user_outlets')
        .select('user_id, outlet_id, outlets(id, name, address)');

      if (userOutletsError) {
        console.error('Error fetching user_outlets:', userOutletsError);
      }

      const { data: procurementRoles, error: procurementRolesError } = await (supabase as any)
        .from('procurement_user_roles')
        .select('user_id, role, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (procurementRolesError) {
        console.error('Error fetching procurement roles:', procurementRolesError);
      }

      const procurementRoleMap = new Map<string, ManagedRole>();
      (procurementRoles || []).forEach((row: any) => {
        if (!procurementRoleMap.has(row.user_id)) {
          procurementRoleMap.set(row.user_id, row.role as ManagedRole);
        }
      });

      // Create a map of user outlets by user_id
      const userOutletsMap = new Map<string, Outlet[]>();
      (userOutlets || []).forEach((uo: any) => {
        const existing = userOutletsMap.get(uo.user_id) || [];
        if (uo.outlets) {
          existing.push({
            id: uo.outlets.id,
            name: uo.outlets.name,
            address: uo.outlets.address,
          });
        }
        userOutletsMap.set(uo.user_id, existing);
      });

      // Map profiles to effective role (procurement first, fallback legacy role in profiles)
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile: any) => {
        const role = (procurementRoleMap.get(profile.id) as AppRole | undefined) || (profile.role as LegacyRole | null);
        return {
          id: profile.id,
          user_id: profile.id, // id is the user_id (references auth.users)
          full_name: profile.full_name || `User ${profile.id.substring(0, 8)}...`,
          email: profile.email || profile.id.substring(0, 8),
          phone: profile.phone || null,
          role,
          created_at: profile.created_at,
          outlets: userOutletsMap.get(profile.id) || [],
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    try {
      await (supabase as any)
        .from('procurement_user_roles')
        .update({ is_active: false })
        .eq('user_id', selectedUser.user_id);

      const { error: roleError } = await (supabase as any)
        .from('procurement_user_roles')
        .upsert(
          {
            user_id: selectedUser.user_id,
            role: selectedRole,
            is_active: true,
          },
          { onConflict: 'user_id,role' }
        );

      if (roleError) throw roleError;

      // Keep legacy profile role compatible for screens that still read profiles.role.
      const legacyRole: LegacyRole =
        selectedRole === 'super_admin' || selectedRole === 'owner'
          ? 'owner'
          : selectedRole === 'pengadaan' || selectedRole === 'gudang'
            ? 'manager'
            : 'staff';

      await supabase
        .from('profiles')
        .update({ role: legacyRole } as any)
        .eq('id', selectedUser.user_id);

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
      const { error } = await (supabase as any)
        .from('procurement_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Role berhasil dihapus' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Update user profile (name, phone, password)
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone || null,
        })
        .eq('id', selectedUser.user_id);

      if (profileError) throw profileError;

      // Update password if provided (using admin API workaround)
      if (editForm.new_password && editForm.new_password.length >= 6) {
        // Note: This requires service_role key or Edge Function
        // For now, we'll just show a message
        toast({
          title: 'Info',
          description: 'Password update requires Supabase Edge Function. Profile updated successfully.',
        });
      }

      toast({ title: 'Berhasil', description: 'Data pengguna berhasil diupdate' });
      setShowEditDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Delete user (profile only - auth user stays but can't access)
  const handleDeleteUser = async () => {
    if (!selectedUser || selectedUser.user_id === currentUser?.id) {
      toast({ title: 'Error', description: 'Tidak bisa menghapus diri sendiri', variant: 'destructive' });
      return;
    }

    try {
      // Delete profile (no need to delete from user_roles - role is in profiles now)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.user_id);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Pengguna berhasil dihapus dari sistem' });
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Add new user (register without email verification)
  const toLegacyOutletRole = (role: ManagedRole): 'owner' | 'manager' | 'staff' => {
    if (role === 'owner' || role === 'super_admin') return 'owner';
    if (role === 'pengadaan' || role === 'gudang') return 'manager';
    return 'staff';
  };

  const handleAddUser = async () => {
    if (!addForm.email || !addForm.password || !addForm.full_name) {
      toast({ title: 'Error', description: 'Email, password, dan nama harus diisi', variant: 'destructive' });
      return;
    }

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: addForm.email,
        password: addForm.password,
        options: {
          data: {
            full_name: addForm.full_name,
            phone: addForm.phone,
            role: addForm.role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: roleError } = await (supabase as any)
          .from('procurement_user_roles')
          .upsert(
            {
              user_id: authData.user.id,
              role: addForm.role,
              is_active: true,
            },
            { onConflict: 'user_id,role' }
          );

        if (roleError) {
          console.error('Role assignment error:', roleError);
        }

        // Assign outlet if selected
        if (addForm.outlet_id) {
          const { error: outletError } = await supabase
            .from('user_outlets')
            .upsert(
              {
                user_id: authData.user.id,
                outlet_id: addForm.outlet_id,
                role: toLegacyOutletRole(addForm.role),
              } as any,
              { onConflict: 'user_id,outlet_id' }
            );

          if (outletError) {
            console.error('Outlet assignment error:', outletError);
          }
        }
      }

      toast({
        title: 'Berhasil',
        description: 'User baru berhasil dibuat. User bisa langsung login tanpa verifikasi email (jika Supabase confirm email disabled).'
      });
      setShowAddDialog(false);
      setAddForm({ email: '', password: '', full_name: '', phone: '', role: 'gudang', outlet_id: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Assign outlet to user
  const handleAssignOutlet = async () => {
    if (!selectedUser) return;

    try {
      // Delete existing user_outlets for this user
      await supabase
        .from('user_outlets')
        .delete()
        .eq('user_id', selectedUser.user_id);

      // Insert new outlets
      if (selectedOutletIds.length > 0) {
        const inserts = selectedOutletIds.map(outletId => ({
          user_id: selectedUser.user_id,
          outlet_id: outletId,
        }));

        const { error } = await supabase
          .from('user_outlets')
          .insert(inserts);

        if (error) throw error;
      }

      toast({ title: 'Berhasil', description: 'Outlet berhasil di-assign ke user' });
      setShowOutletDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error assigning outlet:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Add new outlet
  const handleAddOutlet = async () => {
    if (!outletForm.name) {
      toast({ title: 'Error', description: 'Nama outlet harus diisi', variant: 'destructive' });
      return;
    }
    if (!outletForm.phone) {
      toast({ title: 'Error', description: 'Nomor telepon outlet harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('outlets')
        .insert({
          name: outletForm.name,
          address: outletForm.address || '',
          phone: outletForm.phone,
        });

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Outlet baru berhasil ditambahkan' });
      setShowAddOutletDialog(false);
      setOutletForm({ name: '', address: '', phone: '' });
      fetchOutlets();
    } catch (error: any) {
      console.error('Error adding outlet:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Update outlet
  const handleUpdateOutlet = async () => {
    if (!selectedOutlet || !outletForm.name) {
      toast({ title: 'Error', description: 'Nama outlet harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('outlets')
        .update({
          name: outletForm.name,
          address: outletForm.address || '',
          phone: outletForm.phone || selectedOutlet.phone,
        })
        .eq('id', selectedOutlet.id);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Outlet berhasil diupdate' });
      setShowEditOutletDialog(false);
      setOutletForm({ name: '', address: '', phone: '' });
      setSelectedOutlet(null);
      fetchOutlets();
      fetchUsers(); // Refresh to show updated outlet names
    } catch (error: any) {
      console.error('Error updating outlet:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Delete outlet
  const handleDeleteOutlet = async () => {
    if (!selectedOutlet) return;

    try {
      // First delete user_outlets references
      await supabase
        .from('user_outlets')
        .delete()
        .eq('outlet_id', selectedOutlet.id);

      // Then delete the outlet
      const { error } = await supabase
        .from('outlets')
        .delete()
        .eq('id', selectedOutlet.id);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Outlet berhasil dihapus' });
      setShowDeleteOutletDialog(false);
      setSelectedOutlet(null);
      fetchOutlets();
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting outlet:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-destructive">Super Admin</Badge>;
      case 'pengadaan':
        return <Badge className="bg-info">Pengadaan</Badge>;
      case 'gudang':
        return <Badge className="bg-primary">Gudang</Badge>;
      case 'peracikan_bumbu':
        return <Badge className="bg-accent text-accent-foreground">Peracikan Bumbu</Badge>;
      case 'unit_produksi':
        return <Badge variant="secondary">Unit Produksi</Badge>;
      case 'owner':
        return <Badge className="bg-primary">Owner</Badge>;
      case 'manager':
        return <Badge className="bg-info">Manager (Legacy)</Badge>;
      case 'staff':
        return <Badge variant="secondary">Staff (Legacy)</Badge>;
      case 'investor':
        return <Badge variant="outline">Investor (Legacy)</Badge>;
      case 'customer':
        return <Badge variant="secondary">Customer</Badge>;
      default:
        return <Badge variant="secondary">Belum Ada Role</Badge>;
    }
  };

  const isManagedRole = (role: AppRole | null): role is ManagedRole => {
    return role === 'super_admin' || role === 'owner' || role === 'pengadaan' || role === 'gudang' || role === 'peracikan_bumbu' || role === 'unit_produksi';
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
            <h1 className="font-display text-2xl font-semibold">Manajemen Pengguna & Outlet</h1>
            <p className="text-muted-foreground">Kelola user dan role akses</p>
          </div>
          {isOwner && (
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          )}
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Pengguna
            </TabsTrigger>
            <TabsTrigger value="outlets" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Outlet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
                      <TableHead>Outlet</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-xs text-muted-foreground">{user.user_id.substring(0, 8)}...</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.outlets.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.outlets.map((outlet) => (
                                <Badge key={outlet.id} variant="outline" className="text-xs">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {outlet.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Belum di-assign</span>
                          )}
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Assign Role"
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(isManagedRole(user.role) ? user.role : 'gudang');
                                setShowRoleDialog(true);
                              }}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            {isOwner && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Assign Outlet"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setSelectedOutletIds(user.outlets.map(o => o.id));
                                    setShowOutletDialog(true);
                                  }}
                                >
                                  <Building2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit User"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditForm({
                                      full_name: user.full_name,
                                      phone: user.phone || '',
                                      new_password: '',
                                    });
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.user_id !== currentUser?.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title="Hapus User"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {loading ? 'Memuat...' : 'Tidak ada pengguna'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outlets">
            <Card className="card-warm">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="font-display">Daftar Outlet</CardTitle>
                    <CardDescription>Kelola outlet / cabang bisnis</CardDescription>
                  </div>
                  {isOwner && (
                    <Button onClick={() => {
                      setOutletForm({ name: '', address: '', phone: '' });
                      setShowAddOutletDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Outlet
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Outlet</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Jumlah Staff</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outlets.map((outlet) => {
                      const staffCount = users.filter(u => u.outlets.some(o => o.id === outlet.id)).length;
                      return (
                        <TableRow key={outlet.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{outlet.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {outlet.address ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {outlet.address}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{staffCount} orang</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isOwner && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit Outlet"
                                  onClick={() => {
                                    setSelectedOutlet(outlet);
                                    setOutletForm({
                                      name: outlet.name,
                                      address: outlet.address || '',
                                      phone: outlet.phone || '',
                                    });
                                    setShowEditOutletDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  title="Hapus Outlet"
                                  onClick={() => {
                                    setSelectedOutlet(outlet);
                                    setShowDeleteOutletDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {outlets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Belum ada outlet. Tambah outlet baru untuk memulai.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ManagedRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin - Akses sistem penuh</SelectItem>
                  <SelectItem value="owner">Owner - Kontrol dan monitoring</SelectItem>
                  <SelectItem value="pengadaan">Pengadaan - Kelola pembelian</SelectItem>
                  <SelectItem value="gudang">Gudang - Terima dan distribusi stok</SelectItem>
                  <SelectItem value="peracikan_bumbu">Peracikan Bumbu - Konversi bahan</SelectItem>
                  <SelectItem value="unit_produksi">Unit Produksi - Request material</SelectItem>
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Pengguna
            </DialogTitle>
            <DialogDescription>
              Edit data untuk: {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password Baru (opsional)
              </Label>
              <Input
                type="password"
                value={editForm.new_password}
                onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                placeholder="Kosongkan jika tidak ingin ubah"
              />
              <p className="text-xs text-muted-foreground">
                Minimal 6 karakter. Perubahan password memerlukan Supabase Edge Function.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleUpdateUser}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hapus Pengguna
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus pengguna ini?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="font-medium">{selectedUser?.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.role || 'No Role'}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Pengguna akan dihapus dari sistem dan tidak bisa mengakses aplikasi lagi.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Tambah Pengguna Baru
            </DialogTitle>
            <DialogDescription>
              Buat akun operasional baru untuk tim procurement dan logistik
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v as ManagedRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin - Akses sistem penuh</SelectItem>
                  <SelectItem value="owner">Owner - Kontrol dan monitoring</SelectItem>
                  <SelectItem value="pengadaan">Pengadaan - Kelola pembelian</SelectItem>
                  <SelectItem value="gudang">Gudang - Terima dan distribusi stok</SelectItem>
                  <SelectItem value="peracikan_bumbu">Peracikan Bumbu - Konversi bahan</SelectItem>
                  <SelectItem value="unit_produksi">Unit Produksi - Request material</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={addForm.outlet_id} onValueChange={(v) => setAddForm({ ...addForm, outlet_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet..." />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddUser}>Buat Akun</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outlet Assignment Dialog */}
      <Dialog open={showOutletDialog} onOpenChange={setShowOutletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Assign Outlet
            </DialogTitle>
            <DialogDescription>
              Assign outlet untuk: {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {outlets.map((outlet) => (
                <div key={outlet.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`outlet-${outlet.id}`}
                    checked={selectedOutletIds.includes(outlet.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOutletIds([...selectedOutletIds, outlet.id]);
                      } else {
                        setSelectedOutletIds(selectedOutletIds.filter(id => id !== outlet.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`outlet-${outlet.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{outlet.name}</span>
                    {outlet.address && (
                      <span className="text-muted-foreground text-xs">({outlet.address})</span>
                    )}
                  </label>
                </div>
              ))}
              {outlets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada outlet. Tambah outlet terlebih dahulu.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOutletDialog(false)}>Batal</Button>
            <Button onClick={handleAssignOutlet}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Outlet Dialog */}
      <Dialog open={showAddOutletDialog} onOpenChange={setShowAddOutletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Store className="h-5 w-5" />
              Tambah Outlet Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Outlet *</Label>
              <Input
                value={outletForm.name}
                onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
                placeholder="Contoh: Veroprise Cabang Senayan"
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                value={outletForm.address}
                onChange={(e) => setOutletForm({ ...outletForm, address: e.target.value })}
                placeholder="Jl. Contoh No. 123"
              />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon *</Label>
              <Input
                value={outletForm.phone}
                onChange={(e) => setOutletForm({ ...outletForm, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOutletDialog(false)}>Batal</Button>
            <Button onClick={handleAddOutlet}>Tambah Outlet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Outlet Dialog */}
      <Dialog open={showEditOutletDialog} onOpenChange={setShowEditOutletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Outlet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Outlet *</Label>
              <Input
                value={outletForm.name}
                onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input
                value={outletForm.address}
                onChange={(e) => setOutletForm({ ...outletForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input
                value={outletForm.phone}
                onChange={(e) => setOutletForm({ ...outletForm, phone: e.target.value })}
                placeholder="08123456789"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOutletDialog(false)}>Batal</Button>
            <Button onClick={handleUpdateOutlet}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Outlet Dialog */}
      <Dialog open={showDeleteOutletDialog} onOpenChange={setShowDeleteOutletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hapus Outlet
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus outlet ini?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="font-medium flex items-center gap-2">
                <Store className="h-4 w-4" />
                {selectedOutlet?.name}
              </p>
              {selectedOutlet?.address && (
                <p className="text-sm text-muted-foreground">{selectedOutlet.address}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Semua assignment user ke outlet ini akan dihapus.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteOutletDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteOutlet}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
