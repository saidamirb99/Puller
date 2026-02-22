import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = t('auth.errorEmail');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('auth.errorEmailInvalid');
    if (!formData.password) newErrors.password = t('auth.errorPassword');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await login(formData);
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.detail || t('auth.loginFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 relative overflow-hidden">
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
          <p className="text-gray-400">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">{t('auth.loginTitle')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t('auth.email')} type="email" name="email" placeholder={t('auth.emailPlaceholder')}
              value={formData.email} onChange={handleChange} error={errors.email} required />
            <Input label={t('auth.password')} type="password" name="password" placeholder={t('auth.passwordPlaceholder')}
              value={formData.password} onChange={handleChange} error={errors.password} required />
            {errors.submit && (
              <div className="bg-semantic-error/10 border border-semantic-error text-semantic-error px-4 py-3 rounded-xl">{errors.submit}</div>
            )}
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              {t('auth.login')}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-brand-purple hover:text-brand-purple-light font-medium transition-colors">
                {t('auth.signUp')}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>{t('auth.firstTime')}</p>
        </div>
      </div>
    </div>
  );
};
