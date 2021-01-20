// @ts-nocheck

import fs from "fs";
import { argument, CommandContext, CommandDispatcher, literal, string } from "@jsprismarine/brigadier";
import type PluginApi from "@jsprismarine/prismarine/dist/src/plugin/api/versions/1.0/PluginApi";
import Player from "@jsprismarine/prismarine/dist/src/player/Player";
import Command from "@jsprismarine/prismarine/dist/src/command/Command";
import ChatEvent from "@jsprismarine/prismarine/dist/src/events/chat/ChatEvent";

export default class PluginBase {
    public api: PluginApi;

    public constructor(api: PluginApi) {
        this.api = api;
    }

    public async onEnable() {
        if (!fs.existsSync("./plugins/friend-ship/friends")) fs.mkdirSync("./plugins/friend-ship/friends");
        await this.registerCommands();
        await this.api.getEventManager().on("chat", async (event: ChatEvent) => {
            const message = event.getChat().getMessage()
            if (message.startsWith("§e") && message.endsWith("game")) {
                const player = event.getChat().getSender().getServer().getPlayerManager().getPlayerByExactName(message.split(" ", 1)[0].slice(2));
                const type = message.split(" ", 2)[1];

                if (type === "joined" || type === "left") event.preventDefault();

                let file: any[];
                try {
                    const path = `./plugins/friend-ship/friends/${player.getXUID()}.json`;
                    if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
                    file = JSON.parse(fs.readFileSync(path, "utf8"));
                } catch (error) {
                    return;
                }

                player.getServer().getPlayerManager().getOnlinePlayers().forEach(async Player => {
                    for (const user of file) {
                        if (Player.getXUID() === user["xuid"]) {

                            if (type === "joined") {
                                await Player.sendMessage(`§a${player.getName()} has joined the server!`);
                            } else await Player.sendMessage(`§a${player.getName()} has left the server!`);
                        }
                    }
                })
            }
        });
    }

    public async onDisable() { }

    private async registerCommands() {
        await this.api.getServer().getCommandManager().registerClassCommand(new class FriendCommand extends Command {
            public constructor() {
                super({
                    id: "friends:friend",
                    description: "Add or remove a friend from your friend list.",
                    permission: "friends.command.friend",
                    aliases: ["f"]
                });
            }

            public async register(dispatcher: CommandDispatcher<any>) {
                dispatcher.register(
                    literal("friend").then(
                        argument("edit", string()).executes(async (context: CommandContext<any>) => {
                            const edit = context.getArgument("edit");
                            const sender = context.getSource() as Player;

                            if (edit === "add" || edit === "remove") return await sender.sendMessage("§cNeed to specify a player!");

                            if (edit === "list") {

                                let file: any[];
                                try {
                                    const path = `./plugins/friend-ship/friends/${sender.getXUID()}.json`;
                                    if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
                                    file = JSON.parse(fs.readFileSync(path, "utf8"));
                                } catch (error) {
                                    return await sender.sendMessage("§cYou have no friends! :(");
                                }


                                let message = "";
                                let count = 0;
                                for (const user of file) {
                                    const target = sender.getServer().getPlayerManager().getOnlinePlayers().find(player => player.getXUID() === user["xuid"]);

                                    if (!target) {
                                        if (count < 8) {
                                            message = `${message} §c${user["username"]}§r`
                                            count++;
                                        } else {
                                            message = `${message} §c${user["username"]}§r\n`
                                            count = 0;
                                        }
                                    } else {
                                        if (count < 8) {
                                            message = `${message} §a${user["username"]}§r`
                                            count++;
                                        } else {
                                            message = `${message} §a${user["username"]}§r\n`
                                            count = 0;
                                        }
                                    }
                                }
                                if (message.length === 0) { return await sender.sendMessage("§cYou have no friends! :(") }
                                else return await sender.sendMessage(message);
                            }

                            return await sender.sendMessage(`§c${edit} is not a valid argument!`);
                        }).then(
                            argument("player", string()).executes(async (context: CommandContext<any>) => {
                                const edit = context.getArgument("edit");
                                const sender = context.getSource() as Player;
                                const player = context.getArgument("player");
                                let target: Player;
                                try {
                                    target = sender.getServer().getPlayerManager().getPlayerByName(player);
                                } catch (error) {
                                    return await sender.sendMessage(`§cCan't find the player ${player}!`);
                                }

                                if (!sender.isPlayer()) return await sender.sendMessage("§cYou can't run this in the console");
                                if (sender.getName() === target.getName()) return await sender.sendMessage("§cCan't add/remove your self as a friend!");

                                const path = `./plugins/friend-ship/friends/${sender.getXUID()}.json`;
                                if (!fs.existsSync(path)) fs.createWriteStream(path).write("[]");
                                const file: any[] = JSON.parse(fs.readFileSync(path, "utf8"));

                                if (edit === "add") {
                                    for (const user of file) {
                                        if (user["xuid"] === target.getXUID()) return await sender.sendMessage(`You already have ${target.getName()} as a friend!`);
                                    }

                                    file.push({ "username": target.getName(), "xuid": target.getXUID() });
                                    fs.writeFileSync(path, JSON.stringify(file));
                                    await target.sendMessage(`${sender.getName()} has added you as a friend!`);

                                    return await sender.sendMessage(`§aAdded ${target.getName()} as a friend!`);
                                }

                                if (edit === "remove") {
                                    let found = false;
                                    for (const user of file) {
                                        if (user["xuid"] === target.getXUID()) found = true;
                                    }
                                    if (!found) return await sender.sendMessage(`${target.getName()} is not on your friend list!`);

                                    const remove = file.map(function (item) { return item.xuid; }).indexOf(target.getXUID());
                                    file.splice(remove, 1);
                                    fs.writeFileSync(path, JSON.stringify(file));

                                    return await sender.sendMessage(`§aRemoved ${target.getName()} from your friend's list!`);
                                }

                                return await sender.sendMessage(`§c${edit} is not a valid argument!`);
                            })
                        )
                    )
                );
            }
        }, this.api.getServer());
    }
}