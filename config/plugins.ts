export default () => ({
  'users-permissions': {
    enabled: true,
  },
  'graphql': {
    enabled: true,
    config: {
      endpoint: '/graphql',
      shadowCrud: true,
      playgroundAlways: false,
      depthLimit: 7,
      amountLimit: 100,
      apolloServer: {
        tracing: false,
        introspection: true,
      },
    },
  },
});
