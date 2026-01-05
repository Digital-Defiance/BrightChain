/* eslint-disable @typescript-eslint/no-explicit-any */
import MDEditor from '@uiw/react-md-editor';

import { Octokit } from 'octokit';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BlogEditor.css';

function BlogEditor() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('BrightChain');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if token exists in sessionStorage
    const savedToken = sessionStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (token.trim()) {
      sessionStorage.setItem('github_token', token);
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Please enter a valid GitHub token');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('github_token');
    setToken('');
    setIsAuthenticated(false);
  };

  const generateSlug = () => {
    const date = new Date().toISOString().split('T')[0];
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${date}-${slug}`;
  };

  const createMarkdownContent = () => {
    const frontmatter = `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
author: ${author}
excerpt: ${excerpt}
---

`;
    return frontmatter + content;
  };

  const handlePublish = async () => {
    if (!title || !content) {
      setError('Title and content are required');
      return;
    }

    setPublishing(true);
    setError('');

    try {
      const octokit = new Octokit({ auth: token });
      const slug = generateSlug();
      const filename = `${slug}.md`;
      const markdownContent = createMarkdownContent();

      // Repository configuration
      const owner = 'Digital-Defiance';
      const repo = 'BrightChain';

      // Create or update the file
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `showcase/public/blog/${filename}`,
        message: `Add blog post: ${title}`,
        content: btoa(unescape(encodeURIComponent(markdownContent))),
        branch: 'main',
      });

      // Try to trigger deployment workflow (if it exists)
      try {
        await octokit.rest.actions.createWorkflowDispatch({
          owner,
          repo,
          workflow_id: 'deploy.yml', // Adjust if your workflow has a different name
          ref: 'main',
        });
      } catch (workflowErr) {
        console.log('No workflow to trigger (this is optional):', workflowErr);
      }

      // Store the post data temporarily for immediate display
      const postData = {
        slug,
        title,
        author,
        excerpt,
        date: new Date().toISOString().split('T')[0],
        content,
        isNew: true,
      };
      sessionStorage.setItem(`blog_post_${slug}`, JSON.stringify(postData));

      // Add to pending posts array for blog list
      const pendingPostsJson = sessionStorage.getItem('blog_pending_posts');
      const pendingPosts = pendingPostsJson ? JSON.parse(pendingPostsJson) : [];
      pendingPosts.push(postData);
      sessionStorage.setItem(
        'blog_pending_posts',
        JSON.stringify(pendingPosts),
      );

      // Success - navigate directly to the new post
      navigate(`/blog/${slug}`);
    } catch (err: any) {
      console.error('Error publishing:', err);
      setError(err.message || 'Failed to publish blog post');
    } finally {
      setPublishing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="blog-editor-wrapper">
        <div className="blog-editor-container">
          <div className="auth-container">
            <h1>Blog Editor</h1>
            <p>Enter your GitHub Personal Access Token to publish blog posts</p>
            <div className="auth-form">
              <input
                type="password"
                placeholder="GitHub Personal Access Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="token-input"
              />
              <button onClick={handleLogin} className="auth-button">
                Authenticate
              </button>
              {error && <p className="error-message">{error}</p>}
            </div>
            <div className="auth-help">
              <p>
                <strong>How to get a token:</strong>
              </p>
              <ol>
                <li>
                  Go to GitHub Settings → Developer settings → Personal access
                  tokens → Tokens (classic)
                </li>
                <li>Click "Generate new token (classic)"</li>
                <li>Give it a name and select the "repo" scope</li>
                <li>Copy the token and paste it here</li>
              </ol>
              <p className="security-note">
                🔒 Your token is stored only in your browser session and is
                never sent to any server except GitHub.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-editor-wrapper">
      <div className="blog-editor-container">
        <div className="editor-header">
          <h1>New Blog Post</h1>
          <div className="editor-actions">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="editor-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="date-input">Date</label>
              <input
                id="date-input"
                type="text"
                value={new Date().toLocaleDateString()}
                disabled
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description for the blog list"
              className="form-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Content *</label>
            <div data-color-mode="dark">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || '')}
                height={500}
                preview="live"
              />
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="editor-actions">
            <button
              onClick={() => navigate('/blog')}
              className="cancel-button"
              disabled={publishing}
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              className="publish-button"
              disabled={publishing}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogEditor;
