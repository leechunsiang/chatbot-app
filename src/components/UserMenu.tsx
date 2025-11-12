import { User, LogIn, LogOut, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  isAuthenticated: boolean;
  userEmail?: string;
  onAuthRequired?: () => void | Promise<void>;
}

export function UserMenu({ isAuthenticated, userEmail, onAuthRequired }: UserMenuProps) {
  const handleLogout = async () => {
    if (!onAuthRequired) {
      console.error('❌ No onAuthRequired callback provided');
      return;
    }

    try {
      console.log('🚪 Logging out...');
      await onAuthRequired();
      console.log('✅ Logout complete');
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      // Try again even on exception
      try {
        await onAuthRequired();
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
      }
    }
  };

  const handleLoginClick = () => {
    if (onAuthRequired) {
      onAuthRequired();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="User menu"
        >
          <User className="h-5 w-5 text-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated ? (
          <>
            {userEmail && (
              <>
                <div className="px-2 py-1.5 text-sm font-medium">{userEmail}</div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={handleLoginClick} className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              <span>Log in</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLoginClick} className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Sign up</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
