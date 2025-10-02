import { PrismaClient, type Chat, type Message, type User } from '@prisma/client';

const prisma = new PrismaClient();

export type MessageWithUser = Message & { user?: User };
export type ChatWithMessages = Chat & { messages: MessageWithUser[] };

export const dbService = {
  // Chat operations - теперь требуют userId
  async createChat(userId: string, firstName: string, lastName: string) {
    return await prisma.chat.create({
      data: { 
        firstName, 
        lastName,
        userId 
      }
    });
  },

  async updateChat(userId: string, chatId: string, firstName: string, lastName: string) {
    // Проверяем, что чат принадлежит пользователю
    return await prisma.chat.update({
      where: { 
        id: chatId,
        userId // Важно: только свои чаты можно обновлять
      },
      data: { firstName, lastName }
    });
  },

  async deleteChat(userId: string, chatId: string) {
    // Проверяем, что чат принадлежит пользователю
    return await prisma.chat.delete({
      where: { 
        id: chatId,
        userId // Важно: только свои чаты можно удалять
      }
    });
  },

  async getAllChats(userId: string, search?: string) {
    return await prisma.chat.findMany({
      where: {
        userId, // Только чаты текущего пользователя
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Последнее сообщение в чате
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Message operations
  async createMessage(text: string, chatId: string, userId?: string, type: string = 'user') {
    return await prisma.message.create({
      data: {
        text,
        chatId,
        userId,
        type
      },
      include: { user: true }
    });
  },

  async getChatMessages(userId: string, chatId: string) {
    // Проверяем, что чат принадлежит пользователю
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      throw new Error('Chat not found or access denied');
    }

    return await prisma.message.findMany({
      where: { chatId },
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });
  },

  // User operations (for OAuth)
  async findOrCreateUser(provider: string, providerId: string, email: string, name?: string, avatar?: string) {
    let user = await prisma.user.findFirst({
      where: { provider, providerId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { provider, providerId, email, name, avatar }
      });

      // Создаем 3 предопределенных чата для нового пользователя
      const predefinedChats = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
        { firstName: 'Bob', lastName: 'Johnson' }
      ];

      for (const chat of predefinedChats) {
        await this.createChat(user.id, chat.firstName, chat.lastName);
      }
    }

    return user;
  },

  // Проверка принадлежности чата пользователю
  async validateChatOwnership(userId: string, chatId: string): Promise<boolean> {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    return !!chat;
  }
};