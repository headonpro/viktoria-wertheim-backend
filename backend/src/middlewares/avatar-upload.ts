import type { Core } from '@strapi/strapi';

/**
 * Avatar upload middleware to handle file validation and processing
 */
export default (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: any) => {
    // Only apply to avatar upload endpoints
    if (!ctx.request.path.includes('/avatar') || ctx.request.method !== 'POST') {
      return await next();
    }

    const { files } = ctx.request;

    if (files && files.avatar) {
      const file = files.avatar;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' };
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        ctx.status = 400;
        ctx.body = { error: 'File too large. Maximum size is 5MB.' };
        return;
      }

      // Validate image dimensions (optional)
      // You could add image dimension validation here using a library like sharp

      strapi.log.info(`Avatar upload: ${file.name} (${file.size} bytes, ${file.type})`);
    }

    await next();
  };
};