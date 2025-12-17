import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

const MIN_LENGTH = 12;

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: `At least ${MIN_LENGTH} characters`, test: (p) => p.length >= MIN_LENGTH },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

function getStrengthScore(password: string): number {
  if (!password) return 0;
  let score = 0;

  // Length scoring
  if (password.length >= MIN_LENGTH) score += 1;
  if (password.length >= 16) score += 1;

  // Character diversity
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 1;

  // Penalty for common patterns
  if (/^[a-z]+$/i.test(password)) score -= 1;
  if (/^[0-9]+$/.test(password)) score -= 2;
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters

  return Math.max(0, Math.min(4, Math.floor(score / 1.5)));
}

function getStrengthLabel(score: number): { label: string; color: string } {
  switch (score) {
    case 0:
      return { label: 'Very weak', color: 'bg-red-500' };
    case 1:
      return { label: 'Weak', color: 'bg-orange-500' };
    case 2:
      return { label: 'Fair', color: 'bg-yellow-500' };
    case 3:
      return { label: 'Strong', color: 'bg-lime-500' };
    case 4:
      return { label: 'Very strong', color: 'bg-green-500' };
    default:
      return { label: '', color: 'bg-muted' };
  }
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const score = useMemo(() => getStrengthScore(password), [password]);
  const { label, color } = getStrengthLabel(score);
  const metRequirements = useMemo(
    () => requirements.map((req) => ({ ...req, met: req.test(password) })),
    [password]
  );

  if (!password) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            score <= 1 && 'text-red-500',
            score === 2 && 'text-yellow-500',
            score >= 3 && 'text-green-500'
          )}>
            {label}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < score ? color : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {metRequirements.map((req, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn(
              req.met ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
