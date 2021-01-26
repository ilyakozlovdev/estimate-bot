import {
  createObjectFromArrayOfKeys,
  createObjectFromTwoArrays,
} from "./utils";
import { keys } from "./constants";

export class EstimationController {
  constructor(client, msg) {
    this.client = client;
    this.msg = msg;
    this.pollName = msg.content.replace(/^!est /, "");
    this.results = createObjectFromArrayOfKeys(keys, { value: 0, users: [] });
    this.emojieDict = createObjectFromTwoArrays(
      [...client.emojis.cache.array().map((e) => e.name)],
      [...client.emojis.cache.array().map((e) => e.id)]
    );
    this.msg.channel.send(this.pollName).then((res) => {
      this.pollMsg = res;
      this.handler();
    });
  }

  async handler() {
    await Promise.allSettled([
      ...keys.map((key) => this.pollMsg.react(this.emojieDict[key])),
    ]);

    const controller = this.pollMsg.createReactionCollector(
      this.pollVariantsFilter
    );

    controller.on("collect", this.onStopInterrupter(controller));
    controller.on("end", this.controllerEndHandler);
  }

  pollVariantsFilter = (r) => r.emoji.name in this.results;

  onStopInterrupter = (controller) => (r) => {
    if (r.emoji.name === "stop") controller.stop("stopped by user");
  };

  controllerEndHandler = (collection) => {
    collection.forEach((reaction) => {
      if (reaction.emoji.name === "stop") {
        delete this.results[reaction.emoji.name];
        return;
      }
      this.results[reaction.emoji.name].value = reaction.count - 1;

      const filteredUsers = reaction.users.cache
        .filter((user) => user.id !== this.client.user.id)
        .array();

      for (let user of filteredUsers) {
        this.results[reaction.emoji.name].users.push(
          this.msg.guild.members.cache.get(user.id).nickname
        );
      }
    });

    this.msg.channel.send(this.resultsGenerator());
    this.pollMsg.delete();
  };

  resultsGenerator = () => {
    let res = `Задача: ${this.pollName}\n`;

    for (let key in this.results) {
      let emojie = this.client.emojis.cache.get(this.emojieDict[key]);
      const usersStr = this.results[key].users.join(", ");

      res += `${emojie} - ${this.results[key].value}       | ${usersStr}\n`;
    }

    return res;
  };
}