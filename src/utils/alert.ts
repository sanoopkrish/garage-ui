import Swal from "sweetalert2";
import type { SweetAlertResult } from "sweetalert2";

export const  showConfirmDialog = async (
  message: string,
  isHtml: boolean = false,
  confirmText: string = "Yes",
  cancelText: string = "Cancel"
): Promise<SweetAlertResult<any>> => {
  return Swal.fire({
    title: "Are you sure?",
    text: !isHtml?message:'',
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
     ...(isHtml ? { html: message } : { text: message }),
    didOpen: () => {
      // Force a repaint to ensure styles are applied
      const confirmButton = Swal.getConfirmButton();
      const cancelButton = Swal.getCancelButton();
      
      if (confirmButton) {
        confirmButton.style.backgroundColor = "#3085d6";
        confirmButton.style.borderColor = "#3085d6";
      }
      
      if (cancelButton) {
        cancelButton.style.backgroundColor = "#d33";
        cancelButton.style.borderColor = "#d33";
      }
    }
  });
};

export const showSuccessAlert = (message: string): void => {
  Swal.fire({
    icon: "success",
    title: "Success",
    confirmButtonColor: "#28a745",
    confirmButtonText: "OK",
    text: message,
    didOpen: () => {
      // Force a repaint to ensure styles are applied
      const confirmButton = Swal.getConfirmButton();
      
      if (confirmButton) {
        confirmButton.style.backgroundColor = "#28a745";
        confirmButton.style.borderColor = "#28a745";
      }
    }
  });
};

export const showErrorAlert = (message: string): void => {
  Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
  });
};

export const showThreeButtonDialog = async (
  message: string,
  isHtml: boolean = false,
  confirmText: string = "Confirm",
  denyText: string = "Deny",
  cancelText: string = "Cancel"
): Promise<SweetAlertResult<any>> => {
  return Swal.fire({
    title: "Are you sure?",
    ...(isHtml ? { html: message } : { text: message }),
    icon: "warning",
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: confirmText,
    denyButtonText: denyText,
    cancelButtonText: cancelText,
    confirmButtonColor: "#3085d6",
    denyButtonColor: "#d33",
    cancelButtonColor: "#6B7280",
    didOpen: () => {
      // Force a repaint to ensure styles are applied
      const confirmButton = Swal.getConfirmButton();
      const denyButton = Swal.getDenyButton();
      const cancelButton = Swal.getCancelButton();

      if (confirmButton) {
        confirmButton.style.backgroundColor = "#3085d6";
        confirmButton.style.borderColor = "#3085d6";
      }

      if (denyButton) {
        denyButton.style.backgroundColor = "#d33";
        denyButton.style.borderColor = "#d33";
      }

      if (cancelButton) {
        cancelButton.style.backgroundColor = "#6B7280";
        cancelButton.style.borderColor = "#6B7280";
      }
    }
  });
};

export const showInputDialog = async (
  title: string,
  inputLabel: string,
  placeholder: string = "",
  isRequired: boolean = false,
  confirmText: string = "Submit",
  cancelText: string = "Cancel"
): Promise<SweetAlertResult<any>> => {
  return Swal.fire({
    title: title,
    input: "text",
    inputLabel: inputLabel,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: confirmText,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    cancelButtonText: cancelText,
    inputValidator: isRequired ? (value) => {
      if (!value) {
        return `${inputLabel} is required`;
      }
    } : undefined,
    didOpen: () => {
      const confirmButton = Swal.getConfirmButton();
      const cancelButton = Swal.getCancelButton();

      if (confirmButton) {
        confirmButton.style.backgroundColor = "#3085d6";
        confirmButton.style.borderColor = "#3085d6";
      }

      if (cancelButton) {
        cancelButton.style.backgroundColor = "#d33";
        cancelButton.style.borderColor = "#d33";
      }
    }
  });
};

export const showTextareaDialog = async (
  title: string,
  inputLabel: string,
  placeholder: string = "",
  isRequired: boolean = false,
  confirmText: string = "Submit",
  cancelText: string = "Cancel"
): Promise<SweetAlertResult<any>> => {
  return Swal.fire({
    title: title,
    input: "textarea",
    inputLabel: inputLabel,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: confirmText,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    cancelButtonText: cancelText,
    inputValidator: isRequired ? (value) => {
      if (!value) {
        return `${inputLabel} is required`;
      }
    } : undefined,
    didOpen: () => {
      const confirmButton = Swal.getConfirmButton();
      const cancelButton = Swal.getCancelButton();

      if (confirmButton) {
        confirmButton.style.backgroundColor = "#3085d6";
        confirmButton.style.borderColor = "#3085d6";
      }

      if (cancelButton) {
        cancelButton.style.backgroundColor = "#d33";
        cancelButton.style.borderColor = "#d33";
      }
    }
  });
};
