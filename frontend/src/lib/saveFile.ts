/** Hands the browser a file to save, as a download link would. */
export const saveFile = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    // After the click has had its turn; revoking at once can cancel it.
    setTimeout(() => URL.revokeObjectURL(url), 0);
};
