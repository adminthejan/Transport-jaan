import React from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

/**
 * `to`: when given, always navigates to this fixed destination instead of
 * relying on `window.history.back()`. Browser history is unpredictable for
 * entry-point pages like the journey planner — whatever page happened to be
 * visited right before it (which may be a completely unrelated flow, e.g. a
 * different booking system) becomes "back", which is confusing. Pass `to`
 * for any page where there's a well-defined parent to return to.
 */
const BackButton = ({ to = null }) => {
  const handleBack = () => {
    if (to) {
      router.visit(to);
      return;
    }
    window.history.back();
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-[#0955AC] hover:text-[#073d82] font-[500] text-[14px] transition-colors"
    >
      <ChevronLeft className="w-5 h-5" />
      Back
    </button>
  );
};

export default BackButton;