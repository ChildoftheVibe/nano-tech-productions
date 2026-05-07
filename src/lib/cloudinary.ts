export const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

export function cloudinaryUrl(publicId: string, transform = "f_auto,q_auto") {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}
