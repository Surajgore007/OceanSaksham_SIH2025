import React from 'react';
import { usePermissions } from './AuthenticationGuard';

const RoleBasedContent = ({ 
  user,
  allowedRoles = [],
  deniedRoles = [],
  fallback = null,
  children,
  className = ''
}) => {
  const { hasRole, userRole } = usePermissions(user);

  // Check if user has required role
  const hasAllowedRole = allowedRoles?.length === 0 || hasRole(allowedRoles);
  
  // Check if user is in denied roles
  const hasDeniedRole = deniedRoles?.length > 0 && hasRole(deniedRoles);
  
  // Determine if content should be shown
  const shouldShowContent = hasAllowedRole && !hasDeniedRole;

  if (!shouldShowContent) {
    return fallback;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Specific role-based components for common use cases
export const CitizenOnly = ({ user, children, fallback = null }) => (
  <RoleBasedContent 
    user={user} 
    allowedRoles={['citizen']} 
    fallback={fallback}
  >
    {children}
  </RoleBasedContent>
);

export const OfficialOnly = ({ user, children, fallback = null }) => (
  <RoleBasedContent 
    user={user} 
    allowedRoles={['official']} 
    fallback={fallback}
  >
    {children}
  </RoleBasedContent>
);

export const AnalystOnly = ({ user, children, fallback = null }) => (
  <RoleBasedContent 
    user={user} 
    allowedRoles={['analyst']} 
    fallback={fallback}
  >
    {children}
  </RoleBasedContent>
);

export const AdminRoles = ({ user, children, fallback = null }) => (
  <RoleBasedContent 
    user={user} 
    allowedRoles={['official', 'analyst']} 
    fallback={fallback}
  >
    {children}
  </RoleBasedContent>
);

export const AllRoles = ({ user, children, fallback = null }) => (
  <RoleBasedContent 
    user={user} 
    allowedRoles={['citizen', 'official', 'analyst']} 
    fallback={fallback}
  >
    {children}
  </RoleBasedContent>
);

// Navigation item wrapper with role-based visibility
export const RoleBasedNavItem = ({ 
  user, 
  allowedRoles = [], 
  children, 
  className = '' 
}) => {
  const { hasRole } = usePermissions(user);
  
  if (!hasRole(allowedRoles)) {
    return null;
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Feature flag component for role-based features
export const RoleBasedFeature = ({ 
  user, 
  feature, 
  children, 
  fallback = null 
}) => {
  const { userRole } = usePermissions(user);
  
  // Define feature access by role
  const featureAccess = {
    'bulk-operations': ['official', 'analyst'],
    'advanced-analytics': ['analyst'],
    'alert-management': ['official'],
    'report-verification': ['official', 'analyst'],
    'system-settings': ['official'],
    'data-export': ['official', 'analyst'],
    'user-management': ['official'],
    'emergency-broadcast': ['official']
  };
  
  const allowedRoles = featureAccess?.[feature] || [];
  const hasAccess = allowedRoles?.includes(userRole);
  
  if (!hasAccess) {
    return fallback;
  }
  
  return <>{children}</>;
};

// Content wrapper that adapts based on user role
export const AdaptiveContent = ({ user, children }) => {
  const { userRole } = usePermissions(user);
  
  // Clone children and pass role context
  const childrenWithRole = React.Children?.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { userRole, user });
    }
    return child;
  });
  
  return (
    <div className={`role-${userRole}`}>
      {childrenWithRole}
    </div>
  );
};

// Hook for role-based UI customization
export const useRoleBasedUI = (user) => {
  const { userRole, hasRole, canAccess } = usePermissions(user);
  
  const getUIConfig = () => {
    const configs = {
      citizen: {
        primaryColor: 'primary',
        dashboardLayout: 'simplified',
        showAdvancedFeatures: false,
        maxReportsPerDay: 10,
        canViewOtherReports: false
      },
      official: {
        primaryColor: 'secondary',
        dashboardLayout: 'comprehensive',
        showAdvancedFeatures: true,
        maxReportsPerDay: -1, // unlimited
        canViewOtherReports: true,
        canManageAlerts: true,
        canVerifyReports: true
      },
      analyst: {
        primaryColor: 'accent',
        dashboardLayout: 'analytical',
        showAdvancedFeatures: true,
        maxReportsPerDay: -1, // unlimited
        canViewOtherReports: true,
        canExportData: true,
        canViewAnalytics: true
      }
    };
    
    return configs?.[userRole] || configs?.citizen;
  };
  
  return {
    userRole,
    hasRole,
    canAccess,
    uiConfig: getUIConfig()
  };
};

export default RoleBasedContent;