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
      className="flex items-center gap-1 pl-2 pr-4 py-2 rounded-full bg-white border border-[#0000001A] shadow-sm text-[#0955AC] hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] hover:shadow-md font-[600] text-[13px] transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </button>
  );
};

export default BackButton;