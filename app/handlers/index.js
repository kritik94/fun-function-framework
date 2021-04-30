export default [
  {
    pattern: '/',
    handler: function getSomeIndex() {
      return {
        status: 200,
        body: "Hello, world!",
      }
    },
  },

  {
    pattern: /^\/(?<name>\w+)/,
    handler: function getIndexWithName(_, { name }) {
      return {
        status: 200,
        body: `Hey, ${name}!`,
      }
    }
  },
]
