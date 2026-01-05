import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./BlogPost.css";

function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState("");
  const [metadata, setMetadata] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (slug: string) => {
    try {
      // First check if we have cached data from just publishing
      const cachedData = sessionStorage.getItem(`blog_post_${slug}`);
      if (cachedData) {
        const postData = JSON.parse(cachedData);
        setMetadata({
          title: postData.title,
          author: postData.author,
          date: postData.date,
          excerpt: postData.excerpt,
          isNew: true,
        });
        setContent(postData.content);
        setLoading(false);
        return;
      }

      // Try local file
      const response = await fetch(`/blog/${slug}.md`);
      if (response.ok) {
        const text = await response.text();
        parseAndSetPost(text, slug);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log("Error loading post:", err);
    }

    // If all else fails, show error
    setError(true);
    setLoading(false);
  };

  const parseAndSetPost = (text: string, slug: string) => {
    // Parse frontmatter - handle different line ending formats
    const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]+([\s\S]*)$/;
    const frontmatterMatch = text.match(frontmatterRegex);

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const markdown = frontmatterMatch[2];

      const meta: any = {};
      frontmatter.split(/\r?\n/).forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line
            .substring(colonIndex + 1)
            .trim()
            .replace(/^["']|["']$/g, "");
          if (key && value) {
            meta[key] = value;
          }
        }
      });

      // Extract date from slug if not in frontmatter
      if (!meta.date) {
        const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          meta.date = dateMatch[1];
        }
      }

      // Use slug-based title if not in frontmatter
      if (!meta.title) {
        meta.title = slug
          .replace(/^\d{4}-\d{2}-\d{2}-/, "")
          .replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      setMetadata(meta);
      setContent(markdown);
    } else {
      // No frontmatter, use entire content
      setContent(text);

      // Try to extract date from slug and create title
      const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
      const meta: any = {};
      if (dateMatch) {
        meta.date = dateMatch[1];
      }
      meta.title = slug
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .replace(/-/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setMetadata(meta);
    }
  };

  if (loading) {
    return (
      <div className="blog-post-wrapper">
        <div className="blog-post-container">
          <div className="blog-post-loading">Loading post...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-post-wrapper">
        <div className="blog-post-container">
          <div className="blog-post-error">
            <h1>Post Not Found</h1>
            <p>The blog post you're looking for doesn't exist.</p>
            <Link to="/blog" className="back-link">
              ← Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-post-wrapper">
      <div className="blog-post-container">
        {metadata.isNew && (
          <div className="new-post-banner">
            ✨ This post was just published! It will appear in the blog list
            after the next site deployment.
          </div>
        )}
        <article className="blog-post">
          <header className="blog-post-header">
            {metadata.date && (
              <div className="blog-post-date">
                {new Date(metadata.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}
            {metadata.title && <h1>{metadata.title}</h1>}
            {metadata.author && (
              <div className="blog-post-author">By {metadata.author}</div>
            )}
          </header>

          <div className="blog-post-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </article>

        <div className="blog-post-footer">
          <Link to="/blog" className="back-link">
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BlogPost;
