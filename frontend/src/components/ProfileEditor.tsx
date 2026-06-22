'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserProfile, ProfileFormData } from '../types/profile';
import {
  profileSchema,
  type ProfileFormDataZ,
  type ProfileFormDataIn,
  mapServerZodErrorsToForm,
} from '@/lib/schemas';
import { useProfile } from '../hooks/useProfile';
import { User, MapPin, Globe, Lock, Save, X, Camera } from 'lucide-react';

interface ProfileEditorProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function ProfileEditor({ onClose, onSuccess }: ProfileEditorProps) {
  const { profile, updateProfile, loading } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form state is now driven by the Zod schema in `frontend/src/lib/schemas.ts`,
  // so per-field rules live next to the rest of the project's validation.
  // `ProfileFormDataZ` is the Zod-inferred type; the interface imported above
  // stays for callers that haven't migrated.
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<ProfileFormDataIn, any, ProfileFormDataZ>({
    // `@hookform/resolvers@5.x` type-defs include a structural check on
    // `zod._zod.version.minor` ('0' for v3, '4' for v4) that is too strict
    // even though it ships with a Zod v4 adapter. `as unknown as` is used
    // here intentionally: the runtime resolver is correct (validated via
    // the 33-test schema suite + the two ProfileEditor jest tests) and the
    // surrounding `useForm<In, any, Out>` generics still drive our end-
    // to-end type safety. If a future version of @hookform/resolvers
    // relaxes this constraint, drop the cast.
    resolver: zodResolver(
      profileSchema as unknown as Parameters<typeof zodResolver>[0],
    ) as unknown as Resolver<ProfileFormDataIn, any, ProfileFormDataZ>,
    mode: 'onBlur',
  });

  const watchedValues = watch();

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        privacy: profile.privacy || 'public'
      });
      setAvatarPreview(profile.avatar || null);
    }
  }, [profile, reset]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormDataZ) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!profile) {
        setSubmitError('No profile data available');
        return;
      }

      const response = await updateProfile(data);
      
      if (response.success) {
        onSuccess?.();
        onClose?.();
      } else {
        setSubmitError(response.message || 'Failed to update profile');

        // If the API returned a ZodError-shaped payload ({ issues: [...] }),
        // map per-issue messages onto matching form fields so the user
        // sees them inline rather than only as a top-level banner.
        // Fulfils the DoD item:
        // "Server-side validation errors mapped to form fields".
        const errResp = response as unknown as
          { issues?: Array<{ path: Array<string | number>; message: string }> } | null;
        if (errResp && Array.isArray(errResp.issues)) {
          mapServerZodErrorsToForm(
            setError,
            errResp,
            ['name', 'email', 'bio', 'location', 'website'],
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmitError(errorMessage);
      console.error('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    setAvatarPreview(profile?.avatar || null);
    setSubmitError(null);
    onClose?.();
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Edit Profile
        </h2>
        <button
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <Camera className="h-4 w-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Profile Picture</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a new avatar image
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </h3>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name *
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email *
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              {...register('bio')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.bio.message}
              </p>
            )}
          </div>
        </div>

        {/* Location and Website */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Additional Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <input
                id="location"
                type="text"
                {...register('location')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, Country"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Website
              </label>
              <input
                id="website"
                type="url"
                {...register('website')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://yourwebsite.com"
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.website.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </h3>

          <div>
            <label
              htmlFor="privacy"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Profile Visibility
            </label>
            <select
              id="privacy"
              {...register('privacy')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="public">Public - Anyone can view your profile</option>
              <option value="friends-only">Friends Only - Only friends can view</option>
              <option value="private">Private - Only you can view your profile</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || isSubmitting || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
