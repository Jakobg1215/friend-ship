import { argument, CommandContext, CommandDispatcher, literal, string } from "@jsprismarine/brigadier";
import Command from "@jsprismarine/prismarine/dist/src/command/Command";
import Player from "@jsprismarine/prismarine/dist/src/player/Player";
import type PluginApi from "@jsprismarine/prismarine/dist/src/plugin/api/versions/1.0/PluginApi";
import fs from "fs";

export default class PluginBase {
    public api: PluginApi;

    public constructor(api: PluginApi) {
        this.api = api;
    }

    public async onEnable() {
        await this.registerCommands();
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

                            if (edit === "add" || "remove") return await sender.sendMessage("§cNeed to specify a player!");

                            if (edit === "list") {
                                const path = `./friends/${sender.getXUID()}.json`;
                                if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
                                const file: any[] = JSON.parse(fs.readFileSync(path, "utf8"));

                                let message = "";
                                let count = 0;
                                for (const user of file) {
                                    const target = sender.getServer().getPlayerManager().getOnlinePlayers().find(player => player.getXUID() === user["xuid"]);
                                    if (!target) {
                                        if (count < 8) {
                                            message = `${message} §c${user["name"]}§r`
                                            count++;
                                            break;
                                        }
                                        message = `${message} §c${user["name"]}§r\n`
                                        count = 0;
                                    } else {
                                        if (count < 8) {
                                            message = `${message} §a${user["name"]}§r`
                                            count++;
                                            break;
                                        }
                                        message = `${message} §a${user["name"]}§r\n`
                                        count = 0;
                                    }
                                }
                            }

                            return await sender.sendMessage(`§c'${edit}' is not a valid argument!`);
                        }).then(
                            argument("player", string()).executes(async (context: CommandContext<any>) => {
                                const edit = context.getArgument("edit");
                                const sender = context.getSource() as Player;
                                const player = context.getArgument("player");
                                let target: Player;
                                try {
                                    target = sender.getServer().getPlayerManager().getPlayerByName(player);
                                } catch (error) {
                                    return await sender.sendMessage(`§cCan't find the player '${player}'!`);
                                }

                                if (!sender.isPlayer()) return await sender.sendMessage("§cYou can't run this in the console");
                                if (sender.getUsername() === target.getUsername()) return await sender.sendMessage("§cCan't add/remove your self as a friend!");

                                const path = `./friends/${sender.getXUID()}.json`;
                                if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
                                const file: any[] = JSON.parse(fs.readFileSync(path, "utf8"));

                                if (edit === "add") {
                                    for (const user of file) {
                                        if (user["xuid"] === target.getXUID()) return await sender.sendMessage(`You already have a '${target.getUsername()}' as a friend!`);
                                    }

                                    file.push({ "username": target.getUsername(), "xuid": target.getXUID() });
                                    fs.writeFileSync(path, JSON.stringify(file));
                                    await target.sendMessage(`'${sender.getUsername()}' has added you as a friend!`);

                                    return await sender.sendMessage(`§aAdded '${target.getUsername()}' as a friend!`);
                                }

                                if (edit === "remove") {
                                    let found = false;
                                    for (const user of file) {
                                        if (user["xuid"] === target.getXUID()) found = true;
                                    }
                                    if (!found) return await sender.sendMessage(`'${target.getUsername()}' is not on your friend list!`);

                                    const remove = file.map(function (item) { return item.xuid; }).indexOf(target.getXUID());
                                    file.splice(remove, 1);
                                    fs.writeFileSync(path, JSON.stringify(file));

                                    return await sender.sendMessage(`§aRemoved '${target.getUsername()}' from your friend's list!`);
                                }

                                return await sender.sendMessage(`§c'${edit}' is not a valid argument!`);
                            })
                        )
                    )
                );
            }
        }, this.api.getServer());
    }
}