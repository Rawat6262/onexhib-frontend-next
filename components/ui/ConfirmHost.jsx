"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/social/ConfirmDialog";
import { onConfirmRequest } from "@/lib/confirm";

/**
 * Renders the dialog behind confirmAction() (lib/confirm.js). Mounted once in
 * app/providers.jsx. One request at a time; a second request while one is open
 * answers the first with "cancel" so no promise is left hanging.
 */
export default function ConfirmHost() {
  const [request, setRequest] = useState(null);
  const current = useRef(null);

  useEffect(
    () =>
      onConfirmRequest((req) => {
        current.current?.resolve(false);
        current.current = req;
        setRequest(req);
      }),
    []
  );

  const settle = (answer) => {
    current.current?.resolve(answer);
    current.current = null;
    setRequest(null);
  };

  return (
    <ConfirmDialog
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      onConfirm={() => settle(true)}
      title={request?.title || "Are you sure?"}
      description={request?.description}
      confirmLabel={request?.confirmLabel || "Confirm"}
      cancelLabel={request?.cancelLabel || "Cancel"}
      tone={request?.tone || "danger"}
    />
  );
}
