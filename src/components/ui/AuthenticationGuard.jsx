import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthenticationGuard = ({ 
  children, 
  user = null, 
  requiredRoles = [], 
  fallbackPath = '/login',
  loadingComponent = null 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  const isAuthenticated = !!user;
  const userRole = user?.role?.toLowerCase() || '';
  const hasRequiredRole = requiredRoles?.length === 0 || requiredRoles?.includes(userRole);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes?.includes(location?.pathname);

  // Protected routes that require authentication
  const protectedRoutes = [
    '/main-dashboard',
    '/report-submission', 
    '/official-console',
    '/console-alerts'
  ];
  const isProtectedRoute = protectedRoutes?.some(route => 
    location?.pathname?.startsWith(route)
  );

  useEffect(() => {
    const checkAuthentication = () => {
      // Allow access to public routes
      if (isPublicRoute) {
        setIsChecking(false);
        return;
      }

      // Redirect unauthenticated users from protected routes
      if (isProtectedRoute && !isAuthenticated) {
        navigate(fallbackPath, { 
          replace: true,
          state: { from: location?.pathname }
        });
        return;
      }

      // Check role-based access
      if (isAuthenticated && requiredRoles?.length > 0 && !hasRequiredRole) {
        // Redirect to appropriate dashboard based on user role
        const roleBasedRedirect = {
          'citizen': '/main-dashboard',
          'official': '/official-console',
          'analyst': '/main-dashboard'
        };
        
        const redirectPath = roleBasedRedirect?.[userRole] || '/main-dashboard';
        navigate(redirectPath, { replace: true });
        return;
      }

      // Redirect authenticated users away from auth pages
      if (isAuthenticated && ['/login', '/register']?.includes(location?.pathname)) {
        const roleBasedRedirect = {
          'citizen': '/main-dashboard',
          'official': '/official-console', 
          'analyst': '/main-dashboard'
        };
        
        const redirectPath = roleBasedRedirect?.[userRole] || '/main-dashboard';
        navigate(redirectPath, { replace: true });
        return;
      }

      setIsChecking(false);
    };

    // Small delay to prevent flash of content
    const timer = setTimeout(checkAuthentication, 100);
    return () => clearTimeout(timer);
  }, [
    isAuthenticated, 
    hasRequiredRole, 
    location?.pathname, 
    navigate, 
    fallbackPath,
    isPublicRoute,
    isProtectedRoute,
    userRole
  ]);

  // Show loading state while checking authentication
  if (isChecking) {
    if (loadingComponent) {
      return loadingComponent;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">OceanSaksham</h2>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};

// Higher-order component for role-based route protection
export const withRoleGuard = (WrappedComponent, requiredRoles = []) => {
  return function GuardedComponent(props) {
    return (
      <AuthenticationGuard requiredRoles={requiredRoles}>
        <WrappedComponent {...props} />
      </AuthenticationGuard>
    );
  };
};

// Hook for checking user permissions
export const usePermissions = (user) => {
  const userRole = user?.role?.toLowerCase() || '';
  
  const hasRole = (roles) => {
    if (!Array.isArray(roles)) roles = [roles];
    return roles?.includes(userRole);
  };
  
  const canAccess = (route) => {
    const routePermissions = {
      '/main-dashboard': ['citizen', 'official', 'analyst'],
      '/report-submission': ['citizen', 'official', 'analyst'],
      '/official-console': ['official', 'analyst'],
      '/console-alerts': ['official']
    };
    
    const allowedRoles = routePermissions?.[route] || [];
    return allowedRoles?.includes(userRole);
  };
  
  return {
    userRole,
    hasRole,
    canAccess,
    isAuthenticated: !!user
  };
};

export default AuthenticationGuard;