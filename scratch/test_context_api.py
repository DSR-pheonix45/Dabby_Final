import sys
import asyncio

sys.path.append(r"c:\Users\Medhansh Pc\Desktop\Dabby_Final\backend")

from routers.context import get_workbench_context

wb_id = "2d057275-8914-40bd-a836-a453f58dfee3"

async def test():
    try:
        res = await get_workbench_context(wb_id)
        print("Success! Keys in response:", res.keys())
        print("Labels found:", len(res["labels"]))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
