const {verifyToken} = require("./account");
const ApiError = require("../main/apiError");
const {Chat, ChatMember, AccountSession} = require("../main/database/models");

/**
 * Create chat
 * @param req
 * @return {Promise<void>}
 */
const create = async(req) => {
    const account = await verifyToken(req);

    const name = req.body.name;
    const membersList = req.body.membersList;

    if(typeof name === "undefined")
        throw new ApiError(400, "Name undefined");

    if(typeof membersList === "undefined")
        throw new ApiError(400, "Members list undefined");

    let membersIds;
    try{
        membersIds = JSON.parse(membersList);
    } catch (e) {
        throw new ApiError(400, "Members list is not JSON");
    }

    if(membersIds.length <= 0)
        throw new ApiError(400, "Member list is empty");

    const chatCreating = await Chat.create(
        {
            name,
            admin_id: account.id
        }
    );

    if(!chatCreating)
        throw new ApiError(500, "Chat creating error");

    const chat_id = chatCreating.dataValues.id;
    const chat_members = [];

    ChatMember.create(
        {
            chat_id,
            account_id: account.id
        }
    );

    for(let account_id of membersIds) {
        chat_members.push(
            {
                account_id,
                chat_id
            }
        );
    }

    const membersCreating = await ChatMember.bulkCreate(chat_members);

    if(
        membersCreating ||
        chat_members === []
    )
        return {
            chat_id,
            name
        };

    throw new ApiError(500, "Error create chat members");
}

/**
 * Get all chats of my account
 * @param req
 * @return {Promise<void>}
 */
const getList = async(req) => {
    const account = await verifyToken(req);

    const listMyChats = await Chat.findAll(
        {
            include: {
                model: ChatMember,
                where: {
                    account_id: account.id
                }
            }
        }
    );

    if(!listMyChats)
        return {
            chats: []
        };

    return {
        chats: listMyChats
    };
}

/**
 * Remove chat
 * @param req
 * @return {Promise<void>}
 */
const remove = async(req) => {
    const account = await verifyToken(req);
    const chat_id = req.query.chat_id;

    const existsChat = await Chat.findByPk(chat_id);

    if(!existsChat)
        throw new ApiError(500, "Chat wasn't found");

    if(existsChat.dataValues.admin_id !== account.id)
        throw ApiError.forbidden("You're not admin this chat");

    if(!(await existsChat.destroy()))
        throw ApiError.forbidden("Wtf error destroy");

    return {};
}

module.exports = {
    create,
    getList,
    remove
}