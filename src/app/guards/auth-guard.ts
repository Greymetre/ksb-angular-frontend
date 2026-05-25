import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const token = authService.getToken();

  if (!token) {
    router.navigate(['/login'], {
      queryParams: {
        returnUrl: state.url
      }
    });

    return false;
  }

  const permission = route.data['permission'] as string | undefined;
  const permissions = route.data['permissions'] as string[] | undefined;

  if (permission && !authService.hasPermission(permission)) {
    router.navigate(['/forbidden']);
    return false;
  }

  if (permissions?.length && !authService.hasAnyPermission(permissions)) {
    router.navigate(['/forbidden']);
    return false;
  }

  return true;
};