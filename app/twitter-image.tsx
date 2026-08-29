import { createSocialPreviewImage, socialPreviewSize } from '@/lib/social-preview';

export const alt = 'Usayrat Directory - local guide for Markaz Al-Usayrat, Sohag';
export const size = socialPreviewSize;
export const contentType = 'image/png';

export default function TwitterImage() {
  return createSocialPreviewImage();
}
