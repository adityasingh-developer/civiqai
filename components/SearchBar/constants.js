export const PROMPT_SESSION_KEY = "civiqai_prompt";

export const IMAGE_TYPES = ["image/png", "image/jpeg"];
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];

export const DOCUMENT_TYPES = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export const DOCUMENT_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx"];

export const MAX_TOTAL_UPLOAD_BYTES = 3 * 1024 * 1024;

export const DOCUMENT_ACCEPT = "application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,.txt,.doc,.docx,.xls,.xlsx";

export const IMAGE_ACCEPT = "image/png,image/jpeg";

export function isAllowedAttachment(file) {
  if (!file) {
    return false;
  }

  if (IMAGE_TYPES.includes(file.type) || DOCUMENT_TYPES.includes(file.type)) {
    return true;
  }

  const dotIndex = file.name.lastIndexOf(".");
  const extension =
    dotIndex === -1 ? "" : file.name.slice(dotIndex).toLowerCase();

  return (
    IMAGE_EXTENSIONS.includes(extension) ||
    DOCUMENT_EXTENSIONS.includes(extension)
  );
}
