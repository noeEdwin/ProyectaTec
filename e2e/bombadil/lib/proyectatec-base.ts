import {
  always,
  eventually,
  extract,
  weighted,
  actions,
  type Property,
} from "@antithesishq/bombadil";
import { isAction } from "@antithesishq/bombadil/actions";
import {
  registerCustomAction,
  type ActionTemplate,
} from "@antithesishq/bombadil/browser";
import {
  noHttpErrorCodes,
  noUncaughtExceptions,
  noUnhandledPromiseRejections,
  noConsoleErrors,
} from "@antithesishq/bombadil/browser/defaults";
import {
  clicks,
  inputs,
  scroll,
  waitOnce,
} from "@antithesishq/bombadil/browser/defaults/actions";
import { noResourceLeak } from "@antithesishq/bombadil/browser/extras/resources";

export interface RoleSpecConfig {
  roleName: string;
  email?: string;
  password?: string;
  routes: string[];
  allowLogout?: boolean;
}

const setNativeValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
};

const loginWithAccount = registerCustomAction(
  "loginWithAccount",
  async (document, window, email: string, password: string) => {
    if (!window.location.pathname.startsWith("/acceso")) {
      window.location.assign("/acceso");
      await new Promise((r) => setTimeout(r, 700));
      return;
    }

    const emailInput = document.querySelector<HTMLInputElement>(
      'input[type="email"], input[name="email"]'
    );
    const passInput = document.querySelector<HTMLInputElement>(
      'input[type="password"], input[name="password"]'
    );

    if (emailInput && passInput) {
      setNativeValue(emailInput, email);
      setNativeValue(passInput, password);
      await new Promise((r) => setTimeout(r, 120));
      const submit = document.querySelector<HTMLButtonElement>('button[type="submit"]');
      submit?.click();
      await new Promise((r) => setTimeout(r, 900));
    }
  }
);

const navigateToRoute = registerCustomAction(
  "navigateToRoute",
  async (_document, window, path: string) => {
    if (window.location.pathname !== path) {
      window.location.assign(path);
      await new Promise((r) => setTimeout(r, 700));
    }
  }
);

const RAW_ERROR_PATTERNS = [
  "this action is unauthorized",
  "the given data was invalid",
  "sqlstate",
  "internal server error",
  "500 server error",
  "route [",
  "cannot read properties of",
  "is not a function",
];

export function createProyectaTecSpec(config: RoleSpecConfig) {
  const hasToken = extract((state) => {
    try {
      return Boolean(state.window.localStorage.getItem("token"));
    } catch {
      return false;
    }
  });

  const isAuthPage = extract((state) => {
    const p = state.window.location.pathname;
    return p.startsWith("/acceso") || p.startsWith("/registro") || p.startsWith("/olvide-contrasena");
  });

  const bodyTextLength = extract(
    (state) => state.document.body?.innerText?.trim().length ?? 0
  );

  const brokenImageCount = extract((state) => {
    const imgs = Array.from(state.document.querySelectorAll("img"));
    return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
  });

  const horizontalOverflowPx = extract((state) => {
    const docEl = state.document.documentElement;
    return Math.max(0, docEl.scrollWidth - state.window.innerWidth);
  });

  const rawErrorDetected = extract((state) => {
    const text = (state.document.body?.innerText ?? "").toLowerCase();
    for (const pattern of RAW_ERROR_PATTERNS) {
      if (text.includes(pattern)) {
        return pattern;
      }
    }
    return "";
  });

  const page_not_blank: Property = always(() => bodyTextLength.current > 15);
  const no_broken_images: Property = always(() => brokenImageCount.current === 0);
  const no_horizontal_overflow: Property = always(() => horizontalOverflowPx.current <= 12);
  const no_raw_english_or_server_errors: Property = always(
    () => rawErrorDetected.current === ""
  );

  const no_dom_node_leak = noResourceLeak({
    metric: "dom_nodes",
    growthLimit: 4000,
    windowMillis: 20000,
  });

  const no_js_heap_leak = noResourceLeak({
    metric: "js_heap_used",
    growthLimit: 80_000_000,
    windowMillis: 20000,
  });

  const safeClicks = clicks.filter((action: ActionTemplate) => {
    if (isAction(action, "Click") || isAction(action, "DoubleClick")) {
      const fp = isAction(action, "Click")
        ? action.Click.fingerprint
        : action.DoubleClick.fingerprint;
      const label = `${fp.accessibleName ?? ""} ${fp.textContent ?? ""}`.toLowerCase();
      if (!config.allowLogout && label.includes("cerrar sesión")) {
        return false;
      }
      if (label.includes("desactivar mi cuenta") || label.includes("eliminar cuenta")) {
        return false;
      }
    }
    return true;
  });

  const routeNavActions = actions(() =>
    config.routes.map((route) => navigateToRoute(route))
  );

  if (!config.email || !config.password) {
    const explore = weighted([
      [4, routeNavActions],
      [6, safeClicks],
      [4, inputs],
      [2, scroll],
      [1, waitOnce],
    ]);

    return {
      noHttpErrorCodes,
      noUncaughtExceptions,
      noUnhandledPromiseRejections,
      noConsoleErrors,
      page_not_blank,
      no_broken_images,
      no_horizontal_overflow,
      no_raw_english_or_server_errors,
      no_dom_node_leak,
      no_js_heap_leak,
      explore,
    };
  }

  const loginActions = actions(() => [
    loginWithAccount(config.email!, config.password!),
  ]).when(() => !hasToken.current);

  const authenticatedFuzz = weighted([
    [4, routeNavActions],
    [6, safeClicks],
    [4, inputs],
    [2, scroll],
    [1, waitOnce],
  ]).when(() => hasToken.current);

  const login_succeeds_promptly: Property = always(() =>
    !hasToken.current && isAuthPage.current
      ? eventually(() => hasToken.current).within(15, "seconds")
      : true
  );

  const explore = weighted([
    [12, loginActions],
    [10, authenticatedFuzz],
  ]);

  return {
    noHttpErrorCodes,
    noUncaughtExceptions,
    noUnhandledPromiseRejections,
    noConsoleErrors,
    page_not_blank,
    no_broken_images,
    no_horizontal_overflow,
    no_raw_english_or_server_errors,
    login_succeeds_promptly,
    no_dom_node_leak,
    no_js_heap_leak,
    explore,
  };
}
