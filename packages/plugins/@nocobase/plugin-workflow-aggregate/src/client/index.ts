import { Plugin } from '@nocobase/client';
import WorkflowPlugin from '@nocobase/plugin-workflow/client';

import AggregateInstruction from './AggregateInstruction';

export default class extends Plugin {
  async afterAdd() {
    // await this.app.pm.add()
  }

  async beforeLoad() {}

  // You can get and modify the app instance here
  async load() {
    const workflow = this.app.pm.get('workflow') as WorkflowPlugin;
    const aggregateInstruction = new AggregateInstruction();
    workflow.instructions.register(aggregateInstruction.type, aggregateInstruction);
  }
}
