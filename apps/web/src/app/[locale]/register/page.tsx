'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/Header';
import Button from '@/components/Button';

export default function RegisterPage() {
  const t = useTranslations('account');
  const tValidation = useTranslations('validation');
  const tCommon = useTranslations('common');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Clear individual form validation errors when user fixes the specific field
  useEffect(() => {
    if (formErrors.firstName && formData.firstName.trim().length >= 2) {
      setFormErrors(prev => ({ ...prev, firstName: '' }));
    }
  }, [formData.firstName, formErrors.firstName]);

  useEffect(() => {
    if (formErrors.lastName && formData.lastName.trim().length >= 2) {
      setFormErrors(prev => ({ ...prev, lastName: '' }));
    }
  }, [formData.lastName, formErrors.lastName]);

  useEffect(() => {
    if (formErrors.email && formData.email.trim() && /\S+@\S+\.\S+/.test(formData.email)) {
      setFormErrors(prev => ({ ...prev, email: '' }));
    }
  }, [formData.email, formErrors.email]);

  useEffect(() => {
    if (formErrors.password && formData.password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setFormErrors(prev => ({ ...prev, password: '' }));
    }
  }, [formData.password, formErrors.password]);

  useEffect(() => {
    if (formErrors.confirmPassword && formData.password === formData.confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  }, [formData.password, formData.confirmPassword, formErrors.confirmPassword]);

  useEffect(() => {
    if (formErrors.phoneNumber && formData.phoneNumber.trim() && /^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
      setFormErrors(prev => ({ ...prev, phoneNumber: '' }));
    }
  }, [formData.phoneNumber, formErrors.phoneNumber]);

  // Server errors stay until user submits again

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // First name
    if (!formData.firstName.trim()) {
      errors.firstName = tValidation('required');
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = tValidation('firstNameLength');
    }

    // Last name
    if (!formData.lastName.trim()) {
      errors.lastName = tValidation('required');
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = tValidation('lastNameLength');
    }

    // Email
    if (!formData.email.trim()) {
      errors.email = tValidation('required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = tValidation('email');
    }

    // Password
    if (!formData.password) {
      errors.password = tValidation('required');
    } else if (formData.password.length < 8) {
      errors.password = tValidation('password');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = tValidation('passwordStrength');
    }

    // Confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = tValidation('required');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = tValidation('passwordMatch');
    }

    // Phone number (optional)
    if (formData.phoneNumber.trim() && !/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = tValidation('phone');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous server errors when user tries again
    if (error) {
      clearError();
    }
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const success = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        emailAddress: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim() || undefined,
      });

      if (success) {
        setRegistrationSuccess(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>{t('checkingAuth')}</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <p className="text-lg">{t('alreadyLoggedIn')}</p>
        </div>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header className="sticky top-0 z-50" />
        
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('registrationSuccessful')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('verificationEmailSent', { email: formData.email })}
            </p>
            <div className="space-y-4">
              <Button
                as="link"
                href="/login"
                variant="primary"
                size="lg"
                fullWidth
              >
                {tCommon('signIn')}
              </Button>
              <p className="text-sm text-gray-500">
                {t('didntReceiveEmail')}{' '}
                <button 
                  className="text-black hover:underline font-medium"
                  onClick={() => setRegistrationSuccess(false)}
                >
                  {tCommon('tryAgain')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header className="sticky top-0 z-50" />

      {/* Register Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block mb-8">
              <img 
                src="/logoimpactdark.png" 
                alt="Impact Nutrition" 
                className="h-12 mx-auto"
              />
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t('createYourAccount')}
            </h2>
            <p className="text-gray-600">
              {t('joinImpactNutrition')}
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* Global Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 text-sm font-medium">
                    {t('registrationFailed')}
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('firstName')}
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                      formErrors.firstName
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder="John"
                    disabled={isSubmitting}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lastName')}
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                      formErrors.lastName
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder="Doe"
                    disabled={isSubmitting}
                  />
                  {formErrors.lastName && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('emailAddress')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                    formErrors.email
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="john@example.com"
                  disabled={isSubmitting}
                />
                {formErrors.email && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('phoneNumber')} <span className="text-gray-500 font-normal">({tCommon('optional')})</span>
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                    formErrors.phoneNumber
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="+1 (555) 123-4567"
                  disabled={isSubmitting}
                />
                {formErrors.phoneNumber && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.phoneNumber}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-4 py-3 pe-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                      formErrors.password
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder={t('createStrongPassword')}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-600 text-sm mt-1 flex items-start gap-1">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{formErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-4 py-3 pe-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                      formErrors.confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder={t('confirmYourPassword')}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                {t('createAccount')}
              </span>
            </Button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              {t('byCreatingAccount')}{' '}
              <Link href="/terms" className="text-black hover:underline">
                {t('termsOfService')}
              </Link>
              {' '}{tCommon('and')}{' '}
              <Link href="/privacy" className="text-black hover:underline">
                {t('privacyPolicy')}
              </Link>
            </p>

            {/* Sign in link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('alreadyHaveAccount')}{' '}
                <Link
                  href="/login"
                  className="text-black font-medium hover:underline"
                >
                  {tCommon('signIn')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}