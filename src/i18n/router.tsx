import { forwardRef } from "react";
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useNavigate as useRouterNavigate,
  type LinkProps,
  type NavLinkProps,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import { localizePath, useLang, type Lang } from "./index";

/** Localizes only in-app absolute paths; hashes, query-only and external URLs pass through. */
function localizeTo(to: To, lang: Lang): To {
  if (typeof to !== "string") return to;
  if (!to.startsWith("/")) return to;
  const [pathAndQuery, hash] = to.split("#");
  const [path, query] = pathAndQuery.split("?");
  return `${localizePath(path, lang)}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/** `Link` that keeps the visitor inside the current language. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...rest }, ref) => {
  const lang = useLang();
  return <RouterLink ref={ref} to={localizeTo(to, lang)} {...rest} />;
});
Link.displayName = "LocalizedLink";

/** `NavLink` that keeps the visitor inside the current language. */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ to, ...rest }, ref) => {
  const lang = useLang();
  return <RouterNavLink ref={ref} to={localizeTo(to, lang)} {...rest} />;
});
NavLink.displayName = "LocalizedNavLink";

/** `useNavigate` that keeps programmatic navigation inside the current language. */
export function useNavigate() {
  const navigate = useRouterNavigate();
  const lang = useLang();
  return ((to: To | number, options?: NavigateOptions) => {
    if (typeof to === "number") return navigate(to);
    return navigate(localizeTo(to, lang), options);
  }) as ReturnType<typeof useRouterNavigate>;
}
