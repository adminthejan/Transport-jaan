import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { KeyRound, Search, Shield, UserPlus, Users } from "lucide-react";
import CourierFeedbackModal from "../common/CourierFeedbackModal";
import useCourierActionModal from "../common/useCourierActionModal";

const EMPTY = {
    members: [],
    summary: {
        total: 0,
        active: 0,
        suspended: 0,
        owners: 0,
    },
    memberPagination: { page: 1, perPage: 10, total: 0, totalPages: 1 },
    roleOptions: [],
    rolePermissionMap: {},
    permissionOptions: [],
    teamAccessControl: {
        defaultDirectPermissionsByRole: {},
        defaultDataScopeByRole: {},
        onboardingBundles: [],
        scopeLevels: ["own_records", "assigned_region", "assigned_hub", "all_workspace"],
        scopeOptions: {
            availableZones: [],
            availableHubs: [],
        },
    },
    serviceKey: "courier_service",
    filters: {
        memberSearch: "",
        memberStatus: "",
        memberPage: 1,
        memberPerPage: 10,
        activityAction: "",
        activityPage: 1,
        activityPerPage: 10,
    },
    capabilities: {},
    activity: [],
    activityPagination: { page: 1, perPage: 10, total: 0, totalPages: 1, actions: [] },
};

const statusBadge = (status) => {
    switch (status) {
        case "active":
            return "bg-[#E8FAEF] text-[#1B6C3A]";
        case "suspended":
            return "bg-[#FFE9E9] text-[#8A1C1C]";
        case "revoked":
            return "bg-[#F3F4F6] text-[#374151]";
        case "invited":
            return "bg-[#EAF1FF] text-[#0F3D8A]";
        default:
            return "bg-[#F3F4F6] text-[#374151]";
    }
};

const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
};

const isStepUpRequiredPayload = (payload) => {
    const code = String(payload?.code || payload?.error || "").toLowerCase();
    const message = String(payload?.message || "").toLowerCase();
    return code === "step_up_required" || message.includes("step-up authentication is required");
};

const TeamContent = () => {
    const props = usePage().props;
    const flash = props.flash || {};
    const errors = props.errors || {};
    const team = props.courierTeam || EMPTY;

    const {
        feedback,
        closeFeedback,
        setFeedback,
        confirmState,
        openConfirm,
        closeConfirm,
        runConfirm,
    } = useCourierActionModal(flash, 3000);

    const navigateToStepUpRuntime = () => {
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem("courier.profileStepUpGuidancePending", "1");
        }

        router.get(route("courierService.profile.module", { module: "security" }), {}, {
            preserveScroll: false,
            preserveState: false,
        });
    };

    const handleStepUpOrFeedback = (payload, fallbackMessage) => {
        if (isStepUpRequiredPayload(payload)) {
            navigateToStepUpRuntime();
            return true;
        }

        setFeedback({ type: "error", message: payload?.message || fallbackMessage });
        return false;
    };

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showSessions, setShowSessions] = useState(false);
    const [activeMember, setActiveMember] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [permissionSearchCreate, setPermissionSearchCreate] = useState("");
    const [permissionSearchEdit, setPermissionSearchEdit] = useState("");
    const [memberSearch, setMemberSearch] = useState(team.filters?.memberSearch || "");
    const [memberStatus, setMemberStatus] = useState(team.filters?.memberStatus || "");
    const [activityAction, setActivityAction] = useState(team.filters?.activityAction || "");
    const [bulkSelection, setBulkSelection] = useState([]);
    const [bulkRoleName, setBulkRoleName] = useState(team.roleOptions?.[0] || "courier_dispatcher");
    const [showActivityDetail, setShowActivityDetail] = useState(false);
    const [activeActivity, setActiveActivity] = useState(null);
    const [createPreview, setCreatePreview] = useState(null);
    const [editPreview, setEditPreview] = useState(null);
    const [previewBusy, setPreviewBusy] = useState(false);

    const [createForm, setCreateForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "courier_dispatcher",
        provisioningBundleKey: "",
        directPermissions: [],
        blockedServiceKeys: [],
    });

    const [teamAccessControlForm, setTeamAccessControlForm] = useState({
        defaultDirectPermissionsByRole: team.teamAccessControl?.defaultDirectPermissionsByRole
        && typeof team.teamAccessControl.defaultDirectPermissionsByRole === "object"
            ? team.teamAccessControl.defaultDirectPermissionsByRole
            : {},
        defaultDataScopeByRole: team.teamAccessControl?.defaultDataScopeByRole
        && typeof team.teamAccessControl.defaultDataScopeByRole === "object"
            ? team.teamAccessControl.defaultDataScopeByRole
            : {},
        onboardingBundles: Array.isArray(team.teamAccessControl?.onboardingBundles)
            ? team.teamAccessControl.onboardingBundles
            : [],
        scopeLevels: Array.isArray(team.teamAccessControl?.scopeLevels)
            ? team.teamAccessControl.scopeLevels
            : ["own_records", "assigned_region", "assigned_hub", "all_workspace"],
        scopeOptions: team.teamAccessControl?.scopeOptions && typeof team.teamAccessControl.scopeOptions === "object"
            ? team.teamAccessControl.scopeOptions
            : { availableZones: [], availableHubs: [] },
    });

    const [editForm, setEditForm] = useState({
        role: "",
        status: "active",
        directPermissions: [],
        blockedServiceKeys: [],
    });
    const [createPreviewContext, setCreatePreviewContext] = useState({
        regionZone: "",
        hubBranch: "",
    });
    const [editPreviewContext, setEditPreviewContext] = useState({
        regionZone: "",
        hubBranch: "",
    });

    const stats = useMemo(() => ({
        total: Number(team.summary?.total || 0),
        active: Number(team.summary?.active || 0),
        suspended: Number(team.summary?.suspended || 0),
        owners: Number(team.summary?.owners || 0),
    }), [team.summary]);

    const caps = team.capabilities || {};
    const canCreateUser = caps.createUser ?? true;
    const canAssignRole = caps.assignRole ?? true;
    const canAssignPermissions = caps.assignPermissions ?? true;
    const canManageStatus = caps.manageStatus ?? true;
    const canViewSessions = caps.viewSessions ?? true;
    const canRevokeSessions = caps.revokeSessions ?? true;
    const canTransferOwnership = caps.transferOwnership ?? true;

    const groupedPermissions = useMemo(() => {
        const source = Array.isArray(team.permissionOptions) ? team.permissionOptions : [];
        return source.reduce((acc, perm) => {
            const group = String(perm || "").split(".")[1] || "other";
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(perm);
            return acc;
        }, {});
    }, [team.permissionOptions]);

    const selectedEditRolePermissions = useMemo(
        () => Array.isArray(team.rolePermissionMap?.[editForm.role]) ? team.rolePermissionMap[editForm.role] : [],
        [team.rolePermissionMap, editForm.role],
    );

    const selectedProvisioningBundle = useMemo(() => {
        return (teamAccessControlForm.onboardingBundles || []).find((bundle) => bundle.key === createForm.provisioningBundleKey) || null;
    }, [teamAccessControlForm.onboardingBundles, createForm.provisioningBundleKey]);

    const effectiveCreatePermissions = useMemo(
        () => {
            const roleDefaults = Array.isArray(teamAccessControlForm.defaultDirectPermissionsByRole?.[createForm.role])
                ? teamAccessControlForm.defaultDirectPermissionsByRole[createForm.role]
                : [];

            const bundleDefaults = Array.isArray(selectedProvisioningBundle?.defaultDirectPermissions)
                ? selectedProvisioningBundle.defaultDirectPermissions
                : [];

            return Array.from(new Set([
                ...(roleDefaults || []),
                ...(bundleDefaults || []),
                ...(createForm.directPermissions || []),
            ]));
        },
        [
            createForm.directPermissions,
            createForm.role,
            teamAccessControlForm.defaultDirectPermissionsByRole,
            createForm.provisioningBundleKey,
        ],
    );

    const effectiveCreateScope = useMemo(() => {
        const roleDefaults = teamAccessControlForm.defaultDataScopeByRole?.[createForm.role] || {};
        return {
            scope: roleDefaults.scope || "own_records",
            regionZones: Array.isArray(roleDefaults.regionZones) ? roleDefaults.regionZones : [],
            hubBranches: Array.isArray(roleDefaults.hubBranches) ? roleDefaults.hubBranches : [],
        };
    }, [teamAccessControlForm.defaultDataScopeByRole, createForm.role]);


    const effectiveEditPermissions = useMemo(
        () => Array.from(new Set([...(selectedEditRolePermissions || []), ...(editForm.directPermissions || [])])),
        [selectedEditRolePermissions, editForm.directPermissions],
    );

    useEffect(() => {
        if (!showCreate || !createForm.role) {
            return;
        }

        const timer = window.setTimeout(() => {
            fetchEffectivePreview({
                roleName: createForm.role,
                explicitGrants: effectiveCreatePermissions,
                regionZone: createPreviewContext.regionZone,
                hubBranch: createPreviewContext.hubBranch,
            }, setCreatePreview);
        }, 180);

        return () => window.clearTimeout(timer);
    }, [showCreate, createForm.role, effectiveCreatePermissions, createPreviewContext.regionZone, createPreviewContext.hubBranch]);

    useEffect(() => {
        if (!showEdit || !editForm.role) {
            return;
        }

        const timer = window.setTimeout(() => {
            fetchEffectivePreview({
                roleName: editForm.role,
                explicitGrants: effectiveEditPermissions,
                regionZone: editPreviewContext.regionZone,
                hubBranch: editPreviewContext.hubBranch,
            }, setEditPreview);
        }, 180);

        return () => window.clearTimeout(timer);
    }, [showEdit, editForm.role, effectiveEditPermissions, editPreviewContext.regionZone, editPreviewContext.hubBranch]);

    const openActivityDetail = (activity) => {
        setActiveActivity(activity);
        setShowActivityDetail(true);
    };

    const applyMemberFilters = (nextPage = 1) => {
        router.get(route("courierService.team.index"), {
            ...team.filters,
            memberSearch,
            memberStatus,
            memberPage: nextPage,
            activityAction,
            activityPage: team.activityPagination?.page || 1,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const applyActivityFilters = (nextPage = 1) => {
        router.get(route("courierService.team.index"), {
            ...team.filters,
            memberSearch,
            memberStatus,
            memberPage: team.memberPagination?.page || 1,
            activityAction,
            activityPage: nextPage,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const openEdit = (member) => {
        setActiveMember(member);
        setEditForm({
            role: member.roles?.[0] || "courier_dispatcher",
            status: member.status || "active",
            directPermissions: Array.isArray(member.directPermissions) ? member.directPermissions : [],
            blockedServiceKeys: Array.isArray(member.blockedServiceKeys) ? member.blockedServiceKeys : [],
        });
        setEditPreviewContext({ regionZone: "", hubBranch: "" });
        setEditPreview(null);
        setShowEdit(true);
    };

    const createUser = () => {
        if ((createPreview?.summary?.deniedCount || 0) > 0) {
            setFeedback({ type: "error", message: createPreview?.denied?.[0]?.explanation || "Some permissions are denied by active policy. Resolve before creating user." });
            return;
        }

        openConfirm({
            title: "Create Team User",
            message: "Create this team user with selected role and permissions?",
            onConfirm: () => {
                router.post(route("courierService.team.store"), {
                    ...createForm,
                    provisioningBundleKey: createForm.provisioningBundleKey || null,
                    directPermissions: effectiveCreatePermissions,
                }, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setShowCreate(false);
                        setCreateForm({
                            name: "",
                            email: "",
                            password: "",
                            role: "courier_dispatcher",
                            provisioningBundleKey: "",
                            directPermissions: [],
                            blockedServiceKeys: [],
                        });
                    },
                    onError: (payload) => {
                        handleStepUpOrFeedback(payload, "Failed to create team user.");
                    },
                });
            },
        });
    };

    const saveAccess = () => {
        if (!activeMember?.userId) {
            return;
        }

        if ((editPreview?.summary?.deniedCount || 0) > 0) {
            setFeedback({ type: "error", message: editPreview?.denied?.[0]?.explanation || "Some permissions are denied by active policy. Resolve before saving." });
            return;
        }

        openConfirm({
            title: "Update Team Access",
            message: "Apply role, permission, and status changes for this user?",
            onConfirm: () => {
                router.patch(route("courierService.team.access.update", { user: activeMember.userId }), editForm, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setShowEdit(false),
                    onError: (payload) => {
                        handleStepUpOrFeedback(payload, "Failed to update team access.");
                    },
                });
            },
        });
    };

    const openMemberSessions = async (member) => {
        setActiveMember(member);
        setShowSessions(true);
        setLoadingSessions(true);

        try {
            const response = await fetch(route("courierService.team.sessions.index", { user: member.userId }) + "?json=1", {
                headers: {
                    Accept: "application/json",
                },
                credentials: "same-origin",
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (handleStepUpOrFeedback(data, "Failed to load active sessions.")) {
                    setShowSessions(false);
                    return;
                }

                throw new Error(data?.message || "Failed to load sessions");
            }

            setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Failed to load active sessions." });
            setSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    };

    const revokeSession = (sessionId) => {
        if (!activeMember?.userId) {
            return;
        }

        openConfirm({
            title: "Revoke Session",
            message: "Terminate this active session?",
            onConfirm: () => {
                router.delete(route("courierService.team.sessions.revoke", { user: activeMember.userId, sessionId }), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setSessions((prev) => prev.filter((item) => item.id !== sessionId));
                    },
                    onError: (payload) => {
                        handleStepUpOrFeedback(payload, "Failed to revoke session.");
                    },
                });
            },
        });
    };

    const revokeAllSessions = () => {
        if (!activeMember?.userId) {
            return;
        }

        openConfirm({
            title: "Revoke All Sessions",
            message: "Terminate all active sessions for this user?",
            onConfirm: () => {
                router.delete(route("courierService.team.sessions.revoke-all", { user: activeMember.userId }), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setSessions([]),
                    onError: (payload) => {
                        handleStepUpOrFeedback(payload, "Failed to revoke all sessions.");
                    },
                });
            },
        });
    };

    const transferOwnership = (member) => {
        openConfirm({
            title: "Transfer Ownership",
            message: `Transfer courier ownership to ${member.name}?`,
            onConfirm: () => {
                router.post(route("courierService.team.transfer-ownership", { newOwner: member.userId }), {}, {
                    preserveScroll: true,
                    preserveState: true,
                    onError: (payload) => {
                        handleStepUpOrFeedback(payload, "Ownership transfer failed.");
                    },
                });
            },
        });
    };

    const toggleInArray = (list, value) => {
        if (list.includes(value)) {
            return list.filter((item) => item !== value);
        }
        return [...list, value];
    };

    const runBulkAction = (action) => {
        if (bulkSelection.length === 0) {
            setFeedback({ type: "warning", message: "Select at least one team user for bulk action." });
            return;
        }

        if (action === "assign_role" && !bulkRoleName) {
            setFeedback({ type: "warning", message: "Select a role before running bulk role assignment." });
            return;
        }

        const labels = {
            suspend: "Suspend Users",
            activate: "Activate Users",
            revoke_all_sessions: "Revoke All Sessions",
            assign_role: "Assign Role",
            deprovision: "Deprovision Users",
        };

        openConfirm({
            title: labels[action] || "Bulk Action",
            message: `Apply bulk action to ${bulkSelection.length} selected users?`,
            onConfirm: () => {
                router.post(route("courierService.team.bulk"), {
                    userIds: bulkSelection,
                    action,
                    roleName: action === "assign_role" ? bulkRoleName : null,
                }, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setBulkSelection([]),
                    onError: (payload) => {
                        handleStepUpOrFeedback(payload, "Bulk action failed.");
                    },
                });
            },
        });
    };

    const fetchEffectivePreview = async (payload, setter) => {
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
            setPreviewBusy(true);

            const response = await fetch(route("courierService.team.effective-access-preview"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (handleStepUpOrFeedback(result, "Failed to load effective access preview.")) {
                    setter(null);
                    return;
                }

                throw new Error(result?.message || "Failed to load effective access preview.");
            }

            setter(result);
        } catch (error) {
            setter(null);
            handleStepUpOrFeedback({ message: error?.message }, "Failed to load effective access preview.");
        } finally {
            setPreviewBusy(false);
        }
    };

    return (
        <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
            <CourierFeedbackModal
                open={Boolean(feedback)}
                type={feedback?.type || "info"}
                message={feedback?.message || ""}
                passwordChangeRequired={Boolean(feedback?.passwordChangeRequired)}
                passwordChangeTargetUrl={feedback?.passwordChangeTargetUrl || ""}
                onClose={closeFeedback}
            />

            <CourierFeedbackModal
                open={confirmState.open}
                type={confirmState.type || "warning"}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText || "Confirm"}
                showCancel={true}
                onConfirm={runConfirm}
                onClose={closeConfirm}
            />

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">Courier Team Management</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Manage courier team users, ownership, direct permissions, service blocking, and active sessions.
                    </p>
                </div>
                <button
                    type="button"
                    disabled={!canCreateUser}
                    onClick={() => {
                        setCreatePreview(null);
                        setCreatePreviewContext({ regionZone: "", hubBranch: "" });
                        setShowCreate(true);
                    }}
                    className="h-[38px] px-5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] inline-flex items-center gap-2 disabled:opacity-50"
                >
                    <UserPlus size={16} />
                    Add Team User
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Total Team Users</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{stats.total}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Active</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{stats.active}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Suspended</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{stats.suspended}</p>
                </div>
                <div className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[600]">Owners</p>
                    <p className="text-[26px] leading-tight font-[700] mt-1">{stats.owners}</p>
                </div>
            </div>

            <div className="bg-white rounded-[10px] p-4 lg:p-6" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[22px] font-[700] text-[#111827]">Team Users</h2>
                    <div className="inline-flex items-center gap-2 text-[12px] text-[#6B7280]">
                        <Shield size={14} />
                        Service-scoped RBAC (Courier)
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                    <div className="md:col-span-2 h-[38px] min-w-[240px] bg-[#F3F4F6] rounded-[8px] px-3 flex items-center gap-2">
                        <Search size={16} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Search by team user name or email"
                            className="w-full bg-transparent border-none focus:ring-0 outline-none text-[14px]"
                        />
                    </div>
                    <select value={memberStatus} onChange={(e) => setMemberStatus(e.target.value)} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px]">
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="suspended">Suspended</option>
                        <option value="revoked">Revoked</option>
                    </select>
                    <button type="button" onClick={() => applyMemberFilters(1)} className="h-[38px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">Apply</button>
                </div>

                {canManageStatus && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <button type="button" onClick={() => runBulkAction("suspend")} className="h-[32px] px-3 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700]">Suspend Selected</button>
                        <button type="button" onClick={() => runBulkAction("activate")} className="h-[32px] px-3 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700]">Activate Selected</button>
                        <button type="button" onClick={() => runBulkAction("revoke_all_sessions")} className="h-[32px] px-3 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700]">Revoke Sessions (Selected)</button>
                        {canAssignRole && canAssignPermissions && (
                            <>
                                <select
                                    value={bulkRoleName}
                                    onChange={(e) => setBulkRoleName(e.target.value)}
                                    className="h-[32px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                >
                                    {(team.roleOptions || []).map((roleName) => (
                                        <option key={`bulk-role-${roleName}`} value={roleName}>{titleCase(roleName)}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => runBulkAction("assign_role")} className="h-[32px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[12px] font-[700]">Assign Role (Selected)</button>
                            </>
                        )}
                        <button type="button" onClick={() => runBulkAction("deprovision")} className="h-[32px] px-3 rounded-[8px] border border-[#DC2626] text-[#DC2626] text-[12px] font-[700]">Deprovision Selected</button>
                        <p className="text-[12px] text-[#6B7280]">Selected: {bulkSelection.length}</p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[13px]">
                        <thead className="bg-[#D8E4F2] text-[#1F2937]">
                            <tr>
                                <th className="px-4 py-3 font-[700]">
                                    <input
                                        type="checkbox"
                                        checked={team.members.length > 0 && bulkSelection.length === team.members.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setBulkSelection(team.members.map((m) => m.userId));
                                            } else {
                                                setBulkSelection([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 font-[700]">User</th>
                                <th className="px-4 py-3 font-[700]">Role</th>
                                <th className="px-4 py-3 font-[700]">Membership</th>
                                <th className="px-4 py-3 font-[700]">Status</th>
                                <th className="px-4 py-3 font-[700]">Direct Permissions</th>
                                <th className="px-4 py-3 font-[700]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {team.members.length > 0 ? team.members.map((member) => (
                                <tr key={member.membershipId} className="border-b border-[#E5E7EB]">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={bulkSelection.includes(member.userId)}
                                            onChange={() => setBulkSelection((prev) => toggleInArray(prev, member.userId))}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-[700]">{member.name}</p>
                                        <p className="text-[#6B7280] text-[11px]">{member.email}</p>
                                    </td>
                                    <td className="px-4 py-3">{titleCase(member.roles?.[0] || "-")}</td>
                                    <td className="px-4 py-3">{titleCase(member.membershipRole)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-[700] ${statusBadge(member.status)}`}>{titleCase(member.status)}</span>
                                    </td>
                                    <td className="px-4 py-3">{Array.isArray(member.directPermissions) ? member.directPermissions.length : 0}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            {(canAssignRole || canAssignPermissions || canManageStatus) && (
                                                <button type="button" onClick={() => openEdit(member)} className="h-[28px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700]">Manage</button>
                                            )}
                                            {canViewSessions && (
                                                <button type="button" onClick={() => openMemberSessions(member)} className="h-[28px] px-2 rounded-[6px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700] inline-flex items-center gap-1">
                                                <KeyRound size={12} /> Sessions
                                                </button>
                                            )}
                                            {canTransferOwnership && member.membershipRole !== "owner" && (
                                                <button type="button" onClick={() => transferOwnership(member)} className="h-[28px] px-2 rounded-[6px] border border-[#111827] text-[11px] font-[700]">Transfer Owner</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">No courier team members found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <p className="text-[13px] text-[#6B7280]">
                        Members page {team.memberPagination?.page || 1} of {team.memberPagination?.totalPages || 1} ({team.memberPagination?.total || 0} users)
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={(team.memberPagination?.page || 1) <= 1} onClick={() => applyMemberFilters((team.memberPagination?.page || 1) - 1)} className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Previous</button>
                        <button type="button" disabled={(team.memberPagination?.page || 1) >= (team.memberPagination?.totalPages || 1)} onClick={() => applyMemberFilters((team.memberPagination?.page || 1) + 1)} className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[10px] p-4 lg:p-6 mt-5" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[22px] font-[700] text-[#111827]">Team Activity Timeline</h2>
                    <div className="inline-flex items-center gap-2 text-[12px] text-[#6B7280]">
                        <Users size={14} />
                        Latest team-level access actions
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                    <select value={activityAction} onChange={(e) => setActivityAction(e.target.value)} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px] md:col-span-3">
                        <option value="">All Team Actions</option>
                        {(team.activityPagination?.actions || []).map((action) => (
                            <option key={action} value={action}>{titleCase(action)}</option>
                        ))}
                    </select>
                    <button type="button" onClick={() => applyActivityFilters(1)} className="h-[38px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">Apply</button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {Array.isArray(team.activity) && team.activity.length > 0 ? team.activity.map((item) => (
                        <div key={item.id} className="border border-[#E5E7EB] rounded-[8px] px-3 py-3">
                            <p className="text-[13px] font-[700]">{item.description}</p>
                            <p className="text-[11px] text-[#6B7280] mt-1">{titleCase(item.action)} • {item.actorName || "Unknown"} • {formatDateTime(item.createdAt)}</p>
                            <button type="button" onClick={() => openActivityDetail(item)} className="mt-2 h-[26px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700]">View Details</button>
                        </div>
                    )) : (
                        <p className="text-[13px] text-[#6B7280]">No team activity records yet.</p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <p className="text-[13px] text-[#6B7280]">
                        Activity page {team.activityPagination?.page || 1} of {team.activityPagination?.totalPages || 1} ({team.activityPagination?.total || 0} records)
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={(team.activityPagination?.page || 1) <= 1} onClick={() => applyActivityFilters((team.activityPagination?.page || 1) - 1)} className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Previous</button>
                        <button type="button" disabled={(team.activityPagination?.page || 1) >= (team.activityPagination?.totalPages || 1)} onClick={() => applyActivityFilters((team.activityPagination?.page || 1) + 1)} className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[12px] w-full max-w-2xl p-5">
                        <h3 className="text-[20px] font-[700] mb-3">Add Team User</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3" placeholder="Full name" value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} />
                            <input className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} />
                            <input className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3" placeholder="Default password (optional)" value={createForm.password} onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))} />
                            <select disabled={!canAssignRole} className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3 disabled:opacity-50" value={createForm.role} onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}>
                                {team.roleOptions.map((role) => (<option key={role} value={role}>{titleCase(role)}</option>))}
                            </select>
                            <select
                                className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3 md:col-span-2"
                                value={createForm.provisioningBundleKey}
                                onChange={(e) => {
                                    const bundleKey = e.target.value;
                                    const bundle = (teamAccessControlForm.onboardingBundles || []).find((item) => item.key === bundleKey) || null;
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        provisioningBundleKey: bundleKey,
                                        role: bundle?.role || prev.role,
                                        directPermissions: bundle
                                            ? Array.from(new Set([...(prev.directPermissions || []), ...((bundle.defaultDirectPermissions || []))]))
                                            : prev.directPermissions,
                                        blockedServiceKeys: bundle
                                            ? Array.from(new Set([...(prev.blockedServiceKeys || []), ...((bundle.blockedServiceKeys || []))]))
                                            : prev.blockedServiceKeys,
                                    }));
                                }}
                            >
                                <option value="">No onboarding bundle</option>
                                {(teamAccessControlForm.onboardingBundles || []).map((bundle) => (
                                    <option key={bundle.key} value={bundle.key}>{bundle.label}</option>
                                ))}
                            </select>
                        </div>
                        {(errors.name || errors.email || errors.password || errors.role) && (
                            <p className="text-[12px] text-[#DC2626] mt-2">{errors.name || errors.email || errors.password || errors.role}</p>
                        )}

                        <div className="mt-4">
                            <div className="mb-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-[#F9FAFB]">
                                <p className="text-[12px] font-[700] text-[#374151]">New-User Wizard Preview</p>
                                <p className="text-[11px] text-[#6B7280] mt-1">Role: {titleCase(createForm.role || "-")}</p>
                                <p className="text-[11px] text-[#6B7280] mt-1">Effective permissions after role + defaults + explicit grants + deny rules: {createPreview?.summary?.allowedCount ?? effectiveCreatePermissions.length}</p>
                                <p className="text-[11px] text-[#6B7280] mt-1">Data scope: {titleCase(effectiveCreateScope.scope)}</p>
                                <p className="text-[11px] text-[#6B7280] mt-1">Region zones: {effectiveCreateScope.regionZones.length > 0 ? effectiveCreateScope.regionZones.join(", ") : "Any"}</p>
                                <p className="text-[11px] text-[#6B7280] mt-1">Hub branches: {effectiveCreateScope.hubBranches.length > 0 ? effectiveCreateScope.hubBranches.join(", ") : "Any"}</p>
                                {selectedProvisioningBundle && (
                                    <p className="text-[11px] text-[#0F3D8A] mt-1">Bundle: {selectedProvisioningBundle.label}</p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                    <select
                                        className="h-[44px] rounded-[8px] border border-[#D1D5DB] px-2 text-[11px]"
                                        value={createPreviewContext.regionZone}
                                        onChange={(e) => setCreatePreviewContext((prev) => ({ ...prev, regionZone: e.target.value }))}
                                    >
                                        <option value="">Preview Region: Any</option>
                                        {(teamAccessControlForm.scopeOptions?.availableZones || []).map((zone) => (
                                            <option key={`preview-region-${zone}`} value={zone}>{zone}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-[44px] rounded-[8px] border border-[#D1D5DB] px-2 text-[11px]"
                                        value={createPreviewContext.hubBranch}
                                        onChange={(e) => setCreatePreviewContext((prev) => ({ ...prev, hubBranch: e.target.value }))}
                                    >
                                        <option value="">Preview Hub: Any</option>
                                        {(teamAccessControlForm.scopeOptions?.availableHubs || []).map((hub) => (
                                            <option key={`preview-hub-${hub}`} value={hub}>{hub}</option>
                                        ))}
                                    </select>
                                </div>

                                {previewBusy && <p className="text-[11px] text-[#6B7280] mt-1">Calculating effective access preview...</p>}
                                {(createPreview?.denied || []).length > 0 && (
                                    <div className="mt-2 border border-[#FECACA] bg-[#FEF2F2] rounded-[8px] p-2">
                                        <p className="text-[11px] font-[700] text-[#991B1B]">Why denied</p>
                                        {(createPreview.denied || []).slice(0, 3).map((entry, idx) => (
                                            <p key={`create-denied-${idx}`} className="text-[11px] text-[#7F1D1D] mt-1">{entry.explanation}</p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-[13px] font-[700] mb-2">Direct Permissions</p>
                            <input
                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-3 mb-2"
                                placeholder="Search permissions"
                                value={permissionSearchCreate}
                                onChange={(e) => setPermissionSearchCreate(e.target.value)}
                            />
                            <div className="max-h-[220px] overflow-y-auto border border-[#E5E7EB] rounded-[8px] p-2">
                                {Object.keys(groupedPermissions).map((group) => (
                                    <div key={group} className="mb-2">
                                        <p className="text-[11px] font-[700] uppercase text-[#6B7280] mb-1">{titleCase(group)}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {groupedPermissions[group]
                                                .filter((perm) => perm.toLowerCase().includes(permissionSearchCreate.toLowerCase()))
                                                .map((perm) => (
                                                    (() => {
                                                        const roleDefaultChecked = Array.isArray(teamAccessControlForm.defaultDirectPermissionsByRole?.[createForm.role])
                                                            && teamAccessControlForm.defaultDirectPermissionsByRole[createForm.role].includes(perm);
                                                        const checked = effectiveCreatePermissions.includes(perm);
                                                        const lockedByDefault = roleDefaultChecked;

                                                        return (
                                                    <label key={perm} className="inline-flex items-center gap-2 text-[12px]">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canAssignPermissions || lockedByDefault}
                                                            checked={checked}
                                                            onChange={() => setCreateForm((prev) => ({ ...prev, directPermissions: toggleInArray(prev.directPermissions, perm) }))}
                                                        />
                                                        <span>
                                                            {perm}
                                                            {roleDefaultChecked && <span className="ml-1 text-[10px] text-[#166534]">(role default)</span>}
                                                        </span>
                                                    </label>
                                                        );
                                                    })()
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="h-[36px] px-4 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700]">Cancel</button>
                            <button type="button" onClick={createUser} className="h-[36px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">Create User</button>
                        </div>
                    </div>
                </div>
            )}

            {showEdit && activeMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[12px] w-full max-w-2xl p-5">
                        <h3 className="text-[20px] font-[700] mb-3">Manage Access: {activeMember.name}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <select disabled={!canAssignRole} className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3 disabled:opacity-50" value={editForm.role} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}>
                                {team.roleOptions.map((role) => (<option key={role} value={role}>{titleCase(role)}</option>))}
                            </select>
                            <select disabled={!canManageStatus} className="h-[40px] rounded-[8px] border border-[#D1D5DB] px-3 disabled:opacity-50" value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="revoked">Revoked</option>
                            </select>
                        </div>
                        {(errors.role || errors.status || errors.directPermissions) && (
                            <p className="text-[12px] text-[#DC2626] mb-2">{errors.role || errors.status || errors.directPermissions}</p>
                        )}

                        <div className="mb-3 border border-[#E5E7EB] rounded-[8px] p-3">
                            <p className="text-[12px] font-[700] text-[#374151]">Role Preset Preview</p>
                            <p className="text-[11px] text-[#6B7280] mt-1">{editForm.role || "-"} gives {selectedEditRolePermissions.length} permissions by default.</p>
                            <p className="text-[11px] text-[#6B7280] mt-1">Effective permissions after role + defaults + explicit grants + deny rules: {editPreview?.summary?.allowedCount ?? effectiveEditPermissions.length}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <select
                                    className="h-[44px] rounded-[8px] border border-[#D1D5DB] px-2 text-[11px]"
                                    value={editPreviewContext.regionZone}
                                    onChange={(e) => setEditPreviewContext((prev) => ({ ...prev, regionZone: e.target.value }))}
                                >
                                    <option value="">Preview Region: Any</option>
                                    {(teamAccessControlForm.scopeOptions?.availableZones || []).map((zone) => (
                                        <option key={`edit-preview-region-${zone}`} value={zone}>{zone}</option>
                                    ))}
                                </select>
                                <select
                                    className="h-[44px] rounded-[8px] border border-[#D1D5DB] px-2 text-[11px]"
                                    value={editPreviewContext.hubBranch}
                                    onChange={(e) => setEditPreviewContext((prev) => ({ ...prev, hubBranch: e.target.value }))}
                                >
                                    <option value="">Preview Hub: Any</option>
                                    {(teamAccessControlForm.scopeOptions?.availableHubs || []).map((hub) => (
                                        <option key={`edit-preview-hub-${hub}`} value={hub}>{hub}</option>
                                    ))}
                                </select>
                            </div>

                            {previewBusy && <p className="text-[11px] text-[#6B7280] mt-1">Calculating effective access preview...</p>}
                            {(editPreview?.denied || []).length > 0 && (
                                <div className="mt-2 border border-[#FECACA] bg-[#FEF2F2] rounded-[8px] p-2">
                                    <p className="text-[11px] font-[700] text-[#991B1B]">Why denied</p>
                                    {(editPreview.denied || []).slice(0, 3).map((entry, idx) => (
                                        <p key={`edit-denied-${idx}`} className="text-[11px] text-[#7F1D1D] mt-1">{entry.explanation}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="inline-flex items-center gap-2 text-[13px] font-[600]">
                                <input
                                    type="checkbox"
                                    checked={editForm.blockedServiceKeys.includes("courier_service")}
                                    disabled={!canManageStatus}
                                    onChange={() => setEditForm((prev) => ({ ...prev, blockedServiceKeys: toggleInArray(prev.blockedServiceKeys, "courier_service") }))}
                                />
                                Block this user from Courier service
                            </label>
                        </div>

                        <div>
                            <p className="text-[13px] font-[700] mb-2">Direct Permissions</p>
                            <input
                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-3 mb-2"
                                placeholder="Search permissions"
                                value={permissionSearchEdit}
                                onChange={(e) => setPermissionSearchEdit(e.target.value)}
                            />
                            <div className="max-h-[220px] overflow-y-auto border border-[#E5E7EB] rounded-[8px] p-2">
                                {Object.keys(groupedPermissions).map((group) => (
                                    <div key={group} className="mb-2">
                                        <p className="text-[11px] font-[700] uppercase text-[#6B7280] mb-1">{titleCase(group)}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {groupedPermissions[group]
                                                .filter((perm) => perm.toLowerCase().includes(permissionSearchEdit.toLowerCase()))
                                                .map((perm) => (
                                                    <label key={perm} className="inline-flex items-center gap-2 text-[12px]">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canAssignPermissions}
                                                            checked={editForm.directPermissions.includes(perm)}
                                                            onChange={() => setEditForm((prev) => ({ ...prev, directPermissions: toggleInArray(prev.directPermissions, perm) }))}
                                                        />
                                                        {perm}
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setShowEdit(false)} className="h-[36px] px-4 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700]">Cancel</button>
                            <button type="button" onClick={saveAccess} className="h-[36px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">Save Access</button>
                        </div>
                    </div>
                </div>
            )}

            {showSessions && activeMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[12px] w-full max-w-3xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[20px] font-[700]">Active Sessions: {activeMember.name}</h3>
                            <button type="button" onClick={() => setShowSessions(false)} className="h-[32px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px]">Close</button>
                        </div>

                        <div className="mb-3 flex justify-end">
                            {canRevokeSessions && (
                                <button type="button" onClick={revokeAllSessions} className="h-[32px] px-3 rounded-[6px] border border-[#DC2626] text-[#DC2626] text-[12px] font-[700]">Revoke All Sessions</button>
                            )}
                        </div>

                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                            <table className="min-w-full text-left text-[12px]">
                                <thead className="bg-[#F3F4F6]">
                                    <tr>
                                        <th className="px-3 py-2 font-[700]">IP Address</th>
                                        <th className="px-3 py-2 font-[700]">User Agent</th>
                                        <th className="px-3 py-2 font-[700]">Last Activity</th>
                                        <th className="px-3 py-2 font-[700]">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!loadingSessions && sessions.length > 0 ? sessions.map((session) => (
                                        <tr key={session.id} className="border-b border-[#E5E7EB]">
                                            <td className="px-3 py-2">{session.ipAddress || "-"}</td>
                                            <td className="px-3 py-2">{session.userAgent || "-"}</td>
                                            <td className="px-3 py-2">{session.lastActivityAt || "-"}</td>
                                            <td className="px-3 py-2">
                                                {canRevokeSessions && <button type="button" onClick={() => revokeSession(session.id)} className="h-[26px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700]">Revoke</button>}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-8 text-center text-[#6B7280]">{loadingSessions ? "Loading sessions..." : "No active sessions."}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showActivityDetail && activeActivity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[12px] w-full max-w-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[20px] font-[700]">Activity Detail</h3>
                            <button type="button" onClick={() => setShowActivityDetail(false)} className="h-[32px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px]">Close</button>
                        </div>
                        <div className="space-y-2 text-[13px]">
                            <p><span className="font-[700]">Action:</span> {titleCase(activeActivity.action)}</p>
                            <p><span className="font-[700]">Actor:</span> {activeActivity.actorName || "Unknown"}</p>
                            <p><span className="font-[700]">At:</span> {formatDateTime(activeActivity.createdAt)}</p>
                            <p><span className="font-[700]">Description:</span> {activeActivity.description || "-"}</p>
                            <div>
                                <p className="font-[700] mb-1">Metadata</p>
                                <pre className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-3 text-[11px] overflow-x-auto">{JSON.stringify(activeActivity.metadata || {}, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamContent;
