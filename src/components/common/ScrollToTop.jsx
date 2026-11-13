import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Puts every navigation back at the top of the page.
 *
 * The browser only restores scroll position for real document loads; in a SPA
 * the scroll offset simply survives the route change, so opening a product from
 * halfway down the listing dropped the visitor into the middle of the new page.
 *
 * Back and forward are left alone deliberately — returning to a listing should
 * land where you left it, which is what `history.scrollRestoration` already
 * does for POP navigations.
 */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    // `instant` rather than the smooth scroll set on <html>: animating the jump
    // means the new page visibly rushes past, and it fights any focus movement.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, navigationType]);

  return null;
};

export default ScrollToTop;
