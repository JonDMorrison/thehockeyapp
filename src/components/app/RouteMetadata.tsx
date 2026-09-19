import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.hockeyapp.ca";
const SOCIAL_IMAGE = `${SITE_URL}/SitePreview.png`;

interface RouteMeta {
  title: string;
  description: string;
  canonical?: string;
  indexable?: boolean;
}

const publicRoutes: Record<string, RouteMeta> = {
  "/": {
    title: "The Hockey App — Off-Ice Development for Hockey Associations",
    description: "Give every coach a simple weekly plan, every player clear work at home, and your association one view of participation and progress.",
    canonical: "/",
    indexable: true,
  },
  "/features": {
    title: "Features — The Hockey App",
    description: "Weekly plans, player workouts, Hockey Canada skill videos, team participation, and association-wide progress in one private hockey development app.",
    canonical: "/features",
    indexable: true,
  },
  "/pricing": {
    title: "Pricing — The Hockey App",
    description: "Simple plans for hockey associations, coaches, players, and families.",
    canonical: "/pricing",
    indexable: true,
  },
  "/demo": {
    title: "Product Tour — The Hockey App",
    description: "See how associations, coaches, players, and families use one shared hockey development system.",
    canonical: "/demo",
    indexable: true,
  },
  "/about": {
    title: "About — The Hockey App",
    description: "Why The Hockey App was built to connect association standards, coaching plans, player work, and family support.",
    canonical: "/about",
    indexable: true,
  },
  "/privacy": {
    title: "Privacy Policy — The Hockey App",
    description: "How The Hockey App handles account, team, player, and training data.",
    canonical: "/privacy",
    indexable: true,
  },
  "/terms": {
    title: "Terms of Service — The Hockey App",
    description: "Terms and conditions for using The Hockey App.",
    canonical: "/terms",
    indexable: true,
  },
  "/contact": {
    title: "Contact — The Hockey App",
    description: "Contact The Hockey App about association pilots, product support, or privacy requests.",
    canonical: "/contact",
    indexable: true,
  },
};

function getPrivateRouteMeta(pathname: string): RouteMeta {
  if (pathname === "/auth") {
    return { title: "Sign in or create an account — The Hockey App", description: "Use one Hockey App account for every association, team, and player role." };
  }
  if (pathname === "/join" || pathname.startsWith("/join/")) {
    return { title: "Join a team — The Hockey App", description: "Use a private team invitation to connect your existing Hockey App account." };
  }
  if (pathname.startsWith("/guardian/join/")) {
    return { title: "Accept guardian access — The Hockey App", description: "Review and accept a private player guardian invitation." };
  }
  if (pathname.startsWith("/team/adult/join/")) {
    return { title: "Join team staff — The Hockey App", description: "Review and accept a private team staff invitation." };
  }
  if (pathname.startsWith("/association/join/")) {
    return { title: "Join an association — The Hockey App", description: "Review and accept a private association invitation using your existing account." };
  }
  if (pathname.startsWith("/solo/try/")) {
    return { title: "Try a workout — The Hockey App", description: "Open a privately shared Hockey App workout." };
  }
  if (pathname.startsWith("/unsubscribe/")) {
    return { title: "Email preferences — The Hockey App", description: "Update your Hockey App email preferences." };
  }
  return {
    title: "The Hockey App",
    description: "Private hockey development workspace for associations, coaches, players, and families.",
  };
}

export function RouteMetadata() {
  const { pathname } = useLocation();
  const meta = publicRoutes[pathname] ?? getPrivateRouteMeta(pathname);
  const canonicalUrl = meta.canonical ? `${SITE_URL}${meta.canonical}` : null;
  const robots = meta.indexable ? "index, follow" : "noindex, nofollow";

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="robots" content={robots} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={SOCIAL_IMAGE} />
      <meta property="og:image:alt" content={meta.title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={SOCIAL_IMAGE} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
}
