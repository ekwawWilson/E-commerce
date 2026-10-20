'use client';

import { useEffect, useState, useMemo } from 'react';
import { Loader2, Save, Building, CreditCard, Lock, Users, Plus, MoreHorizontal, UserPlus, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supplierApi } from '@/lib/api/supplier';
import { useSupplierAuthStore } from '@/stores/supplier-auth';
import { getPermissions, getRoleLabel, getRoleBadgeColor, type SupplierRole } from '@/lib/supplier-permissions';

interface SupplierProfile {
  id: string;
  businessName: string;
  description: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  mobileMoneyProvider: string | null;
  mobileMoneyNumber: string | null;
}

interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: SupplierRole;
  isActive: boolean;
  createdAt: string;
}

export default function SupplierSettingsPage() {
  const { supplierAdmin } = useSupplierAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Get permissions based on role
  const permissions = useMemo(
    () => getPermissions(supplierAdmin?.role as SupplierRole | undefined),
    [supplierAdmin?.role]
  );

  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phone: '',
    address: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    mobileMoneyProvider: '',
    mobileMoneyNumber: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Team management state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as SupplierRole,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await supplierApi.getProfile();
        if (response.success) {
          setProfile(response.data);
          setFormData({
            businessName: response.data.businessName || '',
            description: response.data.description || '',
            phone: response.data.phone || '',
            address: response.data.address || '',
            bankName: response.data.bankName || '',
            bankAccountNumber: response.data.bankAccountNumber || '',
            bankAccountName: response.data.bankAccountName || '',
            mobileMoneyProvider: response.data.mobileMoneyProvider || '',
            mobileMoneyNumber: response.data.mobileMoneyNumber || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Fetch staff when team tab is accessed
  const fetchStaff = async () => {
    if (!permissions.canManageStaff) return;

    setIsLoadingStaff(true);
    try {
      const response = await supplierApi.getStaff();
      if (response.success) {
        setStaff(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await supplierApi.updateProfile(formData);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await supplierApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffData.name || !newStaffData.email || !newStaffData.password) {
      setError('Please fill all required fields');
      return;
    }

    if (newStaffData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmittingStaff(true);
    setError('');

    try {
      const response = await supplierApi.createStaff({
        name: newStaffData.name,
        email: newStaffData.email,
        password: newStaffData.password,
        role: newStaffData.role,
      });

      if (response.success) {
        setSuccess('Staff member added successfully');
        setIsAddDialogOpen(false);
        setNewStaffData({ name: '', email: '', password: '', role: 'STAFF' });
        fetchStaff();
      } else {
        setError(response.error || 'Failed to add staff member');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff member');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (staffMember: StaffMember) => {
    try {
      const response = await supplierApi.updateStaffStatus(staffMember.id, !staffMember.isActive);
      if (response.success) {
        setSuccess(`Staff member ${staffMember.isActive ? 'deactivated' : 'activated'} successfully`);
        fetchStaff();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff status');
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;

    try {
      const response = await supplierApi.deleteStaff(staffToDelete.id);
      if (response.success) {
        setSuccess('Staff member removed successfully');
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
        fetchStaff();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove staff member');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your store and account settings</p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="business" className="space-y-6" onValueChange={(value) => {
        if (value === 'team' && permissions.canManageStaff) {
          fetchStaff();
        }
      }}>
        <TabsList>
          <TabsTrigger value="business" className="gap-2">
            <Building className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          {permissions.canManageStaff && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Update your business details visible to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleProfileChange}
                  disabled={!permissions.canEditProfile}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleProfileChange}
                  rows={4}
                  placeholder="Tell customers about your business..."
                  disabled={!permissions.canEditProfile}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    placeholder="+237 6XX XXX XXX"
                    disabled={!permissions.canEditProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change email
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleProfileChange}
                  rows={2}
                  placeholder="Your business address..."
                  disabled={!permissions.canEditProfile}
                />
              </div>

              {permissions.canEditProfile && (
                <Button onClick={saveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>
                Configure how you receive payouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bank Account */}
              <div className="space-y-4">
                <h3 className="font-medium">Bank Account</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleProfileChange}
                      placeholder="e.g., Afriland First Bank"
                      disabled={!permissions.canEditProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleProfileChange}
                      placeholder="Your account number"
                      disabled={!permissions.canEditProfile}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">Account Name</Label>
                  <Input
                    id="bankAccountName"
                    name="bankAccountName"
                    value={formData.bankAccountName}
                    onChange={handleProfileChange}
                    placeholder="Name on the account"
                    disabled={!permissions.canEditProfile}
                  />
                </div>
              </div>

              {/* Mobile Money */}
              <div className="space-y-4">
                <h3 className="font-medium">Mobile Money</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mobileMoneyProvider">Provider</Label>
                    <Input
                      id="mobileMoneyProvider"
                      name="mobileMoneyProvider"
                      value={formData.mobileMoneyProvider}
                      onChange={handleProfileChange}
                      placeholder="e.g., MTN MoMo, Orange Money"
                      disabled={!permissions.canEditProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileMoneyNumber">Phone Number</Label>
                    <Input
                      id="mobileMoneyNumber"
                      name="mobileMoneyNumber"
                      value={formData.mobileMoneyNumber}
                      onChange={handleProfileChange}
                      placeholder="+237 6XX XXX XXX"
                      disabled={!permissions.canEditProfile}
                    />
                  </div>
                </div>
              </div>

              {permissions.canEditProfile && (
                <Button onClick={saveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Payment Info
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                </div>
              </div>

              <Button onClick={changePassword} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{supplierAdmin?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{supplierAdmin?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleBadgeColor(supplierAdmin?.role as SupplierRole)}>
                    {getRoleLabel(supplierAdmin?.role as SupplierRole)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management - Only for OWNER */}
        {permissions.canManageStaff && (
          <TabsContent value="team">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage your team and their access permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : staff.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No team members yet</p>
                    <p className="text-sm">Add staff members to help manage your store</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.isActive ? 'default' : 'secondary'}>
                              {member.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {/* Don't show actions for the current user or OWNER role */}
                            {member.id !== supplierAdmin?.id && member.role !== 'OWNER' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleToggleStaffStatus(member)}>
                                    {member.isActive ? (
                                      <>
                                        <UserX className="mr-2 h-4 w-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setStaffToDelete(member);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Role descriptions */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-4">Role Permissions</h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg border">
                      <Badge className={getRoleBadgeColor('OWNER')}>Owner</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Full access to all features including team management
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <Badge className={getRoleBadgeColor('MANAGER')}>Manager</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Manage products, orders, view payouts. Cannot delete products or manage staff
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <Badge className={getRoleBadgeColor('STAFF')}>Staff</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        View products and update order fulfillment only
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a new staff member to your team. They will receive login credentials via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffName">Name <span className="text-destructive">*</span></Label>
              <Input
                id="staffName"
                value={newStaffData.name}
                onChange={(e) => setNewStaffData({ ...newStaffData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email <span className="text-destructive">*</span></Label>
              <Input
                id="staffEmail"
                type="email"
                value={newStaffData.email}
                onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffPassword">Password <span className="text-destructive">*</span></Label>
              <Input
                id="staffPassword"
                type="password"
                value={newStaffData.password}
                onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffRole">Role</Label>
              <Select
                value={newStaffData.role}
                onValueChange={(value: SupplierRole) => setNewStaffData({ ...newStaffData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newStaffData.role === 'MANAGER'
                  ? 'Can manage products, orders, and view payouts'
                  : 'Can only view products and update order fulfillment'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff} disabled={isSubmittingStaff}>
              {isSubmittingStaff ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Staff Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {staffToDelete?.name} from your team?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
