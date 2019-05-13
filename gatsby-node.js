const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.onCreateNode = ({ node, actions, getNode }) => {
    const { createNodeField } = actions

    if (node.internal.type === `MarkdownRemark`) {
        const value = createFilePath({ node, getNode })
        const [month, day, year] = new Date(node.frontmatter.date)
            .toLocaleDateString("en-EN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            })
            .split("/")
        const slug = value.replace("/blog/", "").replace(/\/$/, "")
        const url = `/blog/${year}/${month}/${day}${slug}`

        createNodeField({
            name: `slug`,
            node,
            value: url,
        })
    }
}

// 1. This is called once the data layer is bootstrapped to let plugins create pages from data.
exports.createPages = ({ graphql, actions }) => {
    // 1.1 Getting the method to create pages
    const { createPage } = actions
    // 1.2 Tell which layout Gatsby should use to thse pages
    const blogLayout = path.resolve(`./src/layouts/blog-post.js`)

    // 2 Return the method with the query
    return graphql(`
      query blogPosts {
        allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
          edges {
            node {
              fields {
                slug
              }
              frontmatter {
                title
                date
                author
                category
                tags
                featured
              }
              html
            }
          }
        }
      }
    `).then(result => {
        // 2.1 Handle the errors
        if (result.errors) {
            console.error(result.errors)
            reject(result.errors)
        }

        // 2.2 Our posts are here
        const posts = result.data.allMarkdownRemark.edges
        const postsPerPage = 3
        const postsWithoutFeatured = posts.filter(({ node }) => {
            return !node.frontmatter.featured
        })
        const numPages = Math.ceil(postsWithoutFeatured.length / postsPerPage)
        const categories = []
        const authors = []

        // Creating blog list with pagination
        Array.from({ length: numPages }).forEach((_, i) => {
            createPage({
                path: i === 0 ? `/blog` : `/blog/page/${i + 1}`,
                component: blogListLayout,
                context: {
                    limit: postsPerPage,
                    skip: i * postsPerPage,
                    currentPage: i + 1,
                    numPages,
                },
            })
        })

        // Creating blog posts
        posts.forEach((post, index, arr) => {
            post.node.frontmatter.category.forEach(cat => categories.push(cat))
            authors.push(post.node.frontmatter.author)

            const prev = arr[index - 1]
            const next = arr[index + 1]

            createPage({
                path: post.node.fields.slug,
                component: blogLayout,
                context: {
                    slug: post.node.fields.slug,
                    prev: prev,
                    next: next,
                },
            })
        })
    })
}