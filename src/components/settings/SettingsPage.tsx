import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  User,
  Building2,
  Save,
  Loader2,
  Mail,
  KeyRound,
  Users,
  Crown,
  Shield,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
  };
}

export function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace'>('profile');

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Workspace state
  const [workspaceName, setWorkspaceName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const fetchProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchWorkspaceData = async () => {
    if (!currentWorkspace) return;

    setWorkspaceLoading(true);
    try {
      setWorkspaceName(currentWorkspace.name);

      // Fetch members with their profiles
      const { data: membersData, error } = await supabase
        .from('members')
        .select('*, profiles:user_id(email, full_name)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const membersWithProfiles = membersData?.map((m: any) => ({
        ...m,
        profile: m.profiles,
      })) || [];

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [currentWorkspace]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated');
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveWorkspace = async () => {
    if (!currentWorkspace || !workspaceName.trim()) return;

    setWorkspaceSaving(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: workspaceName.trim() })
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      toast.success('Workspace updated');
      refreshWorkspaces();
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast.error('Failed to update workspace');
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
            <Crown className="w-3 h-3" />
            Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case 'member':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
            <User className="w-3 h-3" />
            Member
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
            {role}
          </span>
        );
    }
  };

  const currentUserRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManageWorkspace = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and workspace settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4 inline-block mr-2" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'workspace'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4 inline-block mr-2" />
          Workspace
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-2xl">
          {profileLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="bg-secondary/50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed here
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="glow"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Security</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <KeyRound className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Password</p>
                        <p className="text-xs text-muted-foreground">
                          Last updated: Unknown
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Workspace Tab */}
      {activeTab === 'workspace' && (
        <div className="space-y-6 max-w-2xl">
          {workspaceLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Workspace Details</CardTitle>
                  <CardDescription>Manage your workspace settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace Name</Label>
                    <Input
                      id="workspaceName"
                      placeholder="Enter workspace name"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      disabled={!canManageWorkspace}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <div className="p-3 rounded-lg bg-secondary/30 text-sm">
                      <span className="capitalize font-medium">{currentWorkspace?.plan || 'Free'}</span>
                      <span className="text-muted-foreground ml-2">plan</span>
                    </div>
                  </div>

                  {canManageWorkspace && (
                    <Button
                      variant="glow"
                      onClick={handleSaveWorkspace}
                      disabled={workspaceSaving || !workspaceName.trim()}
                    >
                      {workspaceSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                  </CardTitle>
                  <CardDescription>
                    {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {member.profile?.full_name || 'Unknown User'}
                            {member.user_id === user?.id && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profile?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
