import type { LocalImageService } from "astro";
import { baseService } from "astro/assets";
import type { SharpImageServiceConfig } from "astro/assets/services/sharp";
import sharp from "sharp";

const hdrImageService: LocalImageService<SharpImageServiceConfig> = {
  ...baseService,

  async validateOptions(options, imageConfig) {
    const isLocalJpeg =
      typeof options.src === "object" &&
      (options.src.format === "jpg" || options.src.format === "jpeg");
    const validatedOptions = await baseService.validateOptions!(
      options,
      imageConfig
    );

    // The output filename is decided before transform(). Keep local JPEG URLs as
    // .jpeg so an untouched HDR JPEG is never emitted behind a .webp URL.
    if (isLocalJpeg) {
      validatedOptions.format = "jpeg";
    }

    return validatedOptions;
  },

  async transform(inputBuffer, transformOptions, imageConfig) {
    const metadata = await sharp(inputBuffer).metadata();

    if (metadata.format === "jpeg" && metadata.gainMap) {
      return { data: inputBuffer, format: "jpeg" };
    }

    const { default: sharpImageService } = await import(
      /* @vite-ignore */ "astro/assets/services/sharp"
    );

    return sharpImageService.transform(
      inputBuffer,
      transformOptions,
      imageConfig
    );
  },
};

export default hdrImageService;
