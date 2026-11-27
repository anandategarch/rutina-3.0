"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Konfirmasi "Buang perubahan?" — dipakai semua sheet add/log agar input yang
 *  sudah diketik tidak hilang diam-diam saat sheet ditutup (swipe/backdrop/back). */
export default function ConfirmDiscard({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
          <AlertDialogDescription>Perubahan yang belum disimpan akan hilang.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="press min-h-[44px] flex-1 sm:flex-none">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="press min-h-[44px] flex-1 sm:flex-none bg-destructive text-white hover:bg-destructive/90"
          >
            Buang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
