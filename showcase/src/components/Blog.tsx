/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Blog.css';

interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  author?: string;
  isNew?: boolean;
}

// Automatically discover all markdown files in public/blog
const blogPosts = import.meta.glob('/public/blog/*.md', {
  as: 'raw',
  eager: true,
});

function Blog() {
  const [posts, setPosts] = useState<BlogPostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadBlogPosts();
    // Check if user is authenticated
    const token = sessionStorage.getItem('github_token');
    setIsAuthenticated(!!token);
  }, []);

  const parseFrontmatter = (content: string) => {
    const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---/;
    const frontmatterMatch = content.match(frontmatterRegex);
    const metadata: any = {};

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      frontmatter.split(/\r?\n/).forEach((line) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line
            .substring(colonIndex + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
          if (key && value) {
            metadata[key] = value;
          }
        }
      });
    }

    return metadata;
  };

  const loadBlogPosts = async () => {
    try {
      const postsWithMeta = Object.entries(blogPosts)
        .filter(([path]) => {
          // Filter out README and other non-post files
          const filename = path.split('/').pop() || '';
          return !filename.toUpperCase().startsWith('README');
        })
        .map(([path, content]) => {
          // Extract filename from path: /public/blog/2025-12-22-title.md
          const filename = path.split('/').pop() || '';
          const slug = filename.replace(/\.md$/, '');

          // Parse frontmatter
          const metadata = parseFrontmatter(content as string);

          // Extract date from filename (YYYY-MM-DD-title.md)
          const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
          const date = dateMatch ? dateMatch[1] : metadata.date || '';

          return {
            slug,
            title:
              metadata.title ||
              slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' '),
            date,
            excerpt: metadata.excerpt || '',
            author: metadata.author || '',
          };
        });

      // Check sessionStorage for newly published posts not yet in build
      const pendingPostsJson = sessionStorage.getItem('blog_pending_posts');
      const cachedPosts = pendingPostsJson ? JSON.parse(pendingPostsJson) : [];

      const validCachedPosts = cachedPosts
        .map((postData: any) => ({
          slug: postData.slug,
          title: postData.title,
          date: postData.date,
          excerpt: postData.excerpt || '',
          author: postData.author || '',
          isNew: true,
        }))
        .filter(
          (post: BlogPostMeta) =>
            // Only include if not already in build
            !postsWithMeta.some((p) => p.slug === post.slug),
        );

      // Merge cached and built posts
      const allPosts = [...postsWithMeta, ...validCachedPosts];

      // Sort by date (newest first)
      allPosts.sort((a, b) => b.date.localeCompare(a.date));
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="blog-wrapper">
        <div className="blog-container">
          <div className="blog-header">
            <h1>BrightChain Blog</h1>
            <p>Thoughts, tutorials, and updates</p>
          </div>
          <div className="blog-loading">Loading posts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-wrapper">
      <div className="blog-container">
        <div className="blog-header">
          <h1>BrightChain Blog</h1>
          <p>Thoughts, tutorials, and updates</p>
          {isAuthenticated && (
            <Link to="/blog/new" className="new-post-button">
              + New Post
            </Link>
          )}
        </div>

        <div className="blog-posts">
          {posts.length === 0 ? (
            <p className="no-posts">No blog posts yet. Check back soon!</p>
          ) : (
            posts.map((post) => (
              <article key={post.slug} className="blog-post-card">
                <Link to={`/blog/${post.slug}`} className="blog-post-link">
                  {post.isNew && <span className="new-badge">✨ New</span>}
                  <div className="blog-post-date">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <h2>{post.title}</h2>
                  {post.excerpt && (
                    <p className="blog-post-excerpt">{post.excerpt}</p>
                  )}
                  {post.author && (
                    <p className="blog-post-author">By {post.author}</p>
                  )}
                </Link>
              </article>
            ))
          )}
        </div>

        <div className="blog-footer">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Blog;
