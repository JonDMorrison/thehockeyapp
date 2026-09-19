import React from "react";

export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-1 text-destructive">*</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}
