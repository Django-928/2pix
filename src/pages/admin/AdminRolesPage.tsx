import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Users,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  user_count: number;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export default function AdminRolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        api.get<Role[]>('/admin/roles'),
        api.get<Record<string, Permission[]>>('/admin/roles/permissions'),
      ]);
      setRoles(rolesData);
      setAllPermissions(permsData);
      setExpandedModules(new Set(Object.keys(permsData)));
    } catch {
      toast.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', permissions: [] });
    setShowCreateModal(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions?.map((p) => p.id) || [],
    });
    setShowEditModal(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/roles', formData);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/roles/${editingRole.id}`, formData);
      setShowEditModal(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`确定要删除角色 "${role.name}" 吗？`)) return;
    try {
      await api.delete(`/admin/roles/${role.id}`);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const togglePermission = (permId: number) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((id) => id !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms = allPermissions[module] || [];
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => formData.permissions.includes(id));

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((id) => !modulePermIds.includes(id)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...modulePermIds])],
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">角色权限</h1>
          <p className="text-dark-400 mt-1">管理系统角色与权限分配</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            <Plus size={18} />
            新建角色
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading && (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-dark-500">
              <RefreshCw size={18} className="animate-spin" />
              加载中...
            </div>
          </div>
        )}
        {!loading &&
          roles.map((role) => (
            <div
              key={role.id}
              className="glass rounded-2xl p-5 hover:bg-purple-500/5 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Shield size={22} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-100">{role.name}</h3>
                    <p className="text-sm text-dark-500">{role.description || '暂无描述'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-dark-400">
                  <Users size={14} />
                  <span>{role.user_count} 个用户</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-400">
                  <Shield size={14} />
                  <span>{role.permissions?.length || 0} 项权限</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {role.permissions?.slice(0, 5).map((perm) => (
                  <span
                    key={perm.id}
                    className="px-2 py-0.5 rounded-md text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  >
                    {perm.name}
                  </span>
                ))}
                {role.permissions && role.permissions.length > 5 && (
                  <span className="px-2 py-0.5 rounded-md text-xs bg-dark-700/50 text-dark-400">
                    +{role.permissions.length - 5}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-purple-500/10">
                <button
                  onClick={() => handleEdit(role)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                >
                  <Edit2 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  disabled={role.user_count > 0 || role.name === '超级管理员'}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={role.user_count > 0 ? '该角色下还有用户' : ''}
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          ))}
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10 sticky top-0 bg-dark-800/95 backdrop-blur-xl z-10">
              <h3 className="text-lg font-semibold text-dark-100">
                {showCreateModal ? '新建角色' : '编辑角色'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={showCreateModal ? handleSubmitCreate : handleSubmitEdit}
              className="p-5 space-y-5"
            >
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">角色名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                    required
                    placeholder="请输入角色名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">角色描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors resize-none"
                    rows={2}
                    placeholder="请输入角色描述"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-dark-300">权限配置</label>
                  <span className="text-xs text-dark-500">
                    已选择 {formData.permissions.length} 项权限
                  </span>
                </div>
                <div className="border border-purple-500/20 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  {Object.entries(allPermissions).map(([module, perms]) => {
                    const isExpanded = expandedModules.has(module);
                    const allSelected = perms.every((p) => formData.permissions.includes(p.id));
                    const someSelected = perms.some((p) => formData.permissions.includes(p.id));
                    return (
                      <div key={module} className="border-b border-purple-500/10 last:border-b-0">
                        <div
                          className="flex items-center justify-between px-4 py-3 bg-dark-900/30 cursor-pointer hover:bg-dark-900/50 transition-colors"
                          onClick={() => toggleModule(module)}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-dark-500" />
                            ) : (
                              <ChevronRight size={16} className="text-dark-500" />
                            )}
                            <span className="font-medium text-dark-200 capitalize">{module}</span>
                            <span className="text-xs text-dark-500">({perms.length}项)</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleModulePermissions(module);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              allSelected
                                ? 'bg-purple-500 border-purple-500'
                                : someSelected
                                ? 'bg-purple-500/50 border-purple-500/50'
                                : 'border-dark-600'
                            }`}
                          >
                            {allSelected && <Check size={12} className="text-white" />}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-4 py-3 grid grid-cols-2 gap-2">
                            {perms.map((perm) => {
                              const isSelected = formData.permissions.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer hover:bg-purple-500/5 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePermission(perm.id)}
                                    className="w-4 h-4 rounded border-purple-500/30 bg-dark-900/50 text-purple-500 focus:ring-purple-500/20"
                                  />
                                  <div>
                                    <p className="text-sm text-dark-200">{perm.name}</p>
                                    <p className="text-xs text-dark-500">{perm.description}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  {showCreateModal ? '创建' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
