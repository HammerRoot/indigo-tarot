import { NextResponse } from 'next/server';

// 预设的问题库，按类别分组
const questionBank = {
  love: [
    "我在感情方面应该如何选择？",
    "我的另一半是什么样的人？",
    "我们的关系会有什么发展？",
    "如何挽回失去的爱情？",
    "我什么时候会遇到真爱？",
    "如何处理感情中的矛盾？",
    "我应该主动表白吗？",
    "这段感情值得我继续吗？",
    "如何让感情更加稳定？",
    "我们是否适合在一起？"
  ],
  career: [
    "我的事业发展前景如何？",
    "什么工作更适合我？",
    "我应该换工作吗？",
    "如何在职场上获得成功？",
    "我的创业想法可行吗？",
    "如何与同事相处？",
    "什么时候是升职的好时机？",
    "如何平衡工作与生活？",
    "我应该学习哪些新技能？",
    "如何找到理想的工作？"
  ],
  relationships: [
    "如何改善我的人际关系？",
    "如何处理与朋友的冲突？",
    "怎样结交更多朋友？",
    "如何与家人和谐相处？",
    "我应该原谅背叛我的人吗？",
    "如何建立更深层的友谊？",
    "怎样处理职场人际关系？",
    "如何提高我的沟通能力？",
    "我该如何表达自己的想法？",
    "如何处理社交焦虑？"
  ],
  personal: [
    "我应该如何规划未来？",
    "如何提升自己的能力？",
    "我的性格有什么优缺点？",
    "如何克服内心的恐惧？",
    "我该如何做重要决定？",
    "如何找到人生的方向？",
    "我应该坚持还是放弃？",
    "如何增强自信心？",
    "我的潜能在哪里？",
    "如何实现内心的平静？"
  ],
  finance: [
    "我的财运如何？",
    "这个投资决策是否明智？",
    "如何改善我的财务状况？",
    "我应该换个理财方式吗？",
    "什么时候是投资的好时机？",
    "如何增加收入来源？",
    "我的消费习惯需要改变吗？",
    "如何规划退休资金？",
    "这次合作会带来收益吗？",
    "我应该贷款买房吗？"
  ],
  health: [
    "我的身体健康状况如何？",
    "如何改善我的生活习惯？",
    "我应该重视哪方面的健康？",
    "如何缓解工作压力？",
    "我的心理状态需要调整吗？",
    "如何保持身心平衡？",
    "这个治疗方案适合我吗？",
    "如何提高生活质量？",
    "我应该改变饮食习惯吗？",
    "如何建立健康的作息？"
  ]
};

export async function GET() {
  try {
    // 从每个类别中随机选择问题
    const categories = Object.keys(questionBank);
    const selectedQuestions: string[] = [];
    
    // 随机选择3个不同类别
    const shuffledCategories = categories.sort(() => Math.random() - 0.5);
    const selectedCategories = shuffledCategories.slice(0, 3);
    
    // 从每个选中的类别随机选择一个问题
    selectedCategories.forEach(category => {
      const questionsInCategory = questionBank[category as keyof typeof questionBank];
      const randomIndex = Math.floor(Math.random() * questionsInCategory.length);
      selectedQuestions.push(questionsInCategory[randomIndex]);
    });
    
    return NextResponse.json({
      questions: selectedQuestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('生成推荐问题失败:', error);
    return NextResponse.json(
      { 
        error: '获取推荐问题失败',
        // 返回默认问题作为后备
        questions: [
          "我在感情方面应该如何选择？",
          "我的事业发展前景如何？",
          "如何改善我的人际关系？"
        ]
      },
      { status: 500 }
    );
  }
}