from litellm import completion
from typing import Optional

class litellmmodel:
    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model

    async def completion(self, image_path: str, maintain_format: bool = True, prior_page: str = "") -> Optional[str]:
        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this image, maintaining the original formatting and layout. Include all numbers, lists, and special characters exactly as they appear."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"file://{image_path}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ]

            response = await completion(
                model=self.model,
                messages=messages,
                max_tokens=4000
            )

            if response and hasattr(response, 'choices') and response.choices:
                return response.choices[0].message.content

            return None
        except Exception as e:
            print(f"Error in litellmmodel completion: {str(e)}")
            return None
