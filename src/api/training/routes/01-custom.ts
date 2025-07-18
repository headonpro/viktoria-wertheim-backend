/**
 * training custom router
 */

export default {
  routes: [
    // Create training (for trainers)
    {
      method: 'POST',
      path: '/trainings/create',
      handler: 'training.createTraining',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Get trainings by team
    {
      method: 'GET',
      path: '/trainings/team/:teamId',
      handler: 'training.findByTeam',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Get upcoming trainings
    {
      method: 'GET',
      path: '/trainings/upcoming',
      handler: 'training.getUpcoming',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Update training attendance
    {
      method: 'PUT',
      path: '/trainings/:id/attendance',
      handler: 'training.updateAttendance',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Complete training
    {
      method: 'PUT',
      path: '/trainings/:id/complete',
      handler: 'training.completeTraining',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Get trainings by trainer
    {
      method: 'GET',
      path: '/trainings/trainer/:trainerId',
      handler: 'training.findByTrainer',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 