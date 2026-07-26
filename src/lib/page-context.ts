import type {
  CategoryGroup,
  NavLink,
  SearchIndexItem,
} from "@/components/types";
import {
  countPostsByCategory,
  getStatusLabel,
  listPublicEssays,
  listPublicPosts,
  listPublicProjects,
  presentSearchFallbackEntries,
} from "@/lib/content";
import { localContentRepository } from "@/lib/content/repository";
import { siteConfig } from "@/lib/site-config";

export async function getPageContext() {
  const [allPosts, allEssays, allProjects] = await Promise.all([
    localContentRepository.listPosts(),
    localContentRepository.listEssays(),
    localContentRepository.listProjects(),
  ]);
  const posts = listPublicPosts(allPosts);
  const essays = listPublicEssays(allEssays);
  const projects = listPublicProjects(allProjects);
  const categoryCounts = countPostsByCategory(posts);
  const categoryGroups: CategoryGroup[] = categoryCounts.map((stat, index) => ({
    index: String(index + 1).padStart(2, "0"),
    label: stat.category,
    count: stat.count,
    entries: posts
      .filter((post) => post.category === stat.category)
      .map((post) => ({
        title: post.title,
        href: post.url,
        summary: post.description,
        category: post.category,
        status: getStatusLabel(post.status),
      })),
  }));
  const searchItems: SearchIndexItem[] = presentSearchFallbackEntries({
    posts,
    essays,
    projects,
  }).map((entry) => ({
    type: entry.type,
    title: entry.title,
    summary: entry.description,
    href: entry.url,
    terms: entry.category,
  }));

  const navLinks: NavLink[] = [
    { label: "首页", href: "/", key: "home" },
    { label: "文稿", href: "/posts/", key: "posts" },
    { label: "随笔", href: "/essays/", key: "essays" },
    { label: "更多", key: "more" },
    { label: "关于", href: "/about/", key: "about", description: "我在做什么" },
    { label: "项目", href: "/projects/", key: "projects", description: "开源与作品集" },
  ];
  const socialLinks = [
    { label: "GitHub", href: siteConfig.github, shortLabel: "GH" },
    { label: "发送邮件", href: `mailto:${siteConfig.email}`, shortLabel: "@" },
    { label: "通过 QQ 联系", href: siteConfig.qqUrl, shortLabel: "QQ" },
  ];

  return {
    allPosts,
    posts,
    essays,
    projects,
    categoryCounts,
    categoryGroups,
    searchItems,
    navLinks,
    socialLinks,
    homePreview: {
      siteName: siteConfig.name,
      counts: [
        { label: "文稿", value: posts.length },
        { label: "随笔", value: essays.length },
        { label: "项目", value: projects.length },
      ],
      note: "保持简单",
      socialLinks,
    },
    postsPreview: {
      categories: categoryGroups,
      footerHref: "/posts/",
      footerLabel: "查看全部文稿",
    },
    footerGroups: [
      {
        label: "阅读",
        links: navLinks.filter((item) => ["posts", "essays"].includes(String(item.key))),
      },
      {
        label: "关于",
        links: navLinks.filter((item) => ["about", "projects"].includes(String(item.key))),
      },
    ],
  };
}
