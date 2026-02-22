import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return '';
    if (password.length < 8) return 'weak';
    if (password.length < 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'medium';
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 'strong';
    return 'medium';
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthColors = { weak: 'bg-semantic-expense', medium: 'bg-yellow-500', strong: 'bg-semantic-income' };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name || formData.name.length < 2) newErrors.name = t('auth.errorName');
    if (!formData.email) newErrors.email = t('auth.errorEmail');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('auth.errorEmailInvalid');
    if (!formData.password) newErrors.password = t('auth.errorPassword');
    else if (formData.password.length < 8) newErrors.password = t('auth.errorPasswordLength');
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('auth.errorPasswordMatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await register({ name: formData.name, email: formData.email, password: formData.password });
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.detail || t('auth.registerFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-purple/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-brand-purple rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">💰</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">FinPulse</h1>
          </div>
          <p className="text-gray-400">{t('auth.registerSubtitle')}</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">{t('auth.registerTitle')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t('auth.fullName')} type="text" name="name" placeholder={t('auth.namePlaceholder')}
              value={formData.name} onChange={handleChange} error={errors.name} required />
            <Input label={t('auth.email')} type="email" name="email" placeholder={t('auth.emailPlaceholder')}
              value={formData.email} onChange={handleChange} error={errors.email} required />
            <div>
              <Input label={t('auth.passwordNew')} type="password" name="password" placeholder={t('auth.passwordNewPlaceholder')}
                value={formData.password} onChange={handleChange} error={errors.password}
                helperText={t('auth.passwordHint')} required />
              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-dark-bg rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthColors[passwordStrength as keyof typeof strengthColors]}`}
                      style={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }} />
                  </div>
                  <span className="text-xs font-medium capitalize text-gray-400">
                    {t(`auth.${passwordStrength}`)}
                  </span>
                </div>
              )}
            </div>
            <Input label={t('auth.confirmPassword')} type="password" name="confirmPassword"
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required />
            {errors.submit && (
              <div className="bg-semantic-error/10 border border-semantic-error text-semantic-error px-4 py-3 rounded-xl">{errors.submit}</div>
            )}
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              {t('auth.createAccount')}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="text-brand-purple hover:text-brand-purple-light font-medium transition-colors">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
