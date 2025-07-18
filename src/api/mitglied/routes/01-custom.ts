/**
 * mitglied custom router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/mitglieder/createMemberWithUser',
      handler: 'mitglied.createMemberWithUser',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/mitglieder/getAllMembersWithUsers',
      handler: 'mitglied.getAllMembersWithUsers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 