import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../utils/authService';

/**
 * AuthenticationGuard
 *
 * Core invariant: IDENTITY, ROLE, and ROUTE are independent.
 * This guard NEVER silently converts a user's role.
 * If a user lacks access it redirects them — it does NOT change who they are.
 *
 * The `user` prop may be null during the brief React render window before
 * a parent's useEffect loads auth state. We fall back to authService to
 * avoid false redirects during initialization.
 */
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

  // Resolve the effective user: prefer prop (already in state), fall back to
  // authService so we don't redirect during the parent's initialization window.
  const effectiveUser = user || authService.getCurrentUser();

  const isAuthenticated = !!effectiveUser;
  const userRole = effectiveUser?.role?.toLowerCase() || '';
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
      // Always allow public routes — no redirect, no spinner
      if (isPublicRoute) {
        setIsChecking(false);
        return;
      }

      // Redirect unauthenticated users from protected routes to login
      if (isProtectedRoute && !isAuthenticated) {
        navigate(fallbackPath, { 
          replace: true,
          state: { from: location?.pathname }
        });
        // Must still clear checking state so component doesn't freeze if
        // the navigation is cancelled or the user presses Back
        setIsChecking(false);
        return;
      }

      // Check role-based access — redirect to the user's OWN dashboard.
      // NEVER change the user's role or identity.
      if (isAuthenticated && requiredRoles?.length > 0 && !hasRequiredRole) {
        const roleBasedRedirect = {
          citizen: '/main-dashboard',
          official: '/official-console',
        };
        const redirectPath = roleBasedRedirect?.[userRole] || '/main-dashboard';
        navigate(redirectPath, { replace: true });
        setIsChecking(false);
        return;
      }

      // Redirect already-authenticated users away from auth pages
      if (isAuthenticated && ['/login', '/register']?.includes(location?.pathname)) {
        const roleBasedRedirect = {
          citizen: '/main-dashboard',
          official: '/official-console',
        };
        const redirectPath = roleBasedRedirect?.[userRole] || '/main-dashboard';
        navigate(redirectPath, { replace: true });
        setIsChecking(false);
        return;
      }

      // All checks passed — allow rendering
      setIsChecking(false);
    };

    // Small delay to allow parent useEffect to set auth state before we check.
    // This prevents false redirects during the React initialization window.
    const timer = setTimeout(checkAuthentication, 150);
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
      '/main-dashboard': ['citizen'],
      '/report-submission': ['citizen', 'official'],
      '/official-console': ['official'],
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
