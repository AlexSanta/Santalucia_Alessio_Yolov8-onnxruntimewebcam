#import rospy
import actionlib
from move_base_msgs.msg import MoveBaseAction, MoveBaseGoal
NODENAME="Detection_node"
class ROSManager(object):
    
    _node = None
    _subscribers = {}
    _instance = None
   
    def __new__(cls):
        if cls._instance is None:
            print('Creating the object')
            cls._instance = super(ROSManager, cls).__new__(cls)
            rospy.init_node(NODENAME,anonymous=True)
            cls._instance._node=True
        return cls._instance
        
     
    @staticmethod
    def get_node():
        return ROSManager._node

   
    def register_subscriber(self,topic, message_type, callback):
        if ROSManager._instance._node is not None:
            ROSManager._subscribers[topic]=rospy.Subscriber(topic, message_type,callback)
            
        else:
            rospy.logwarn("ROS node is not initialized.")
    
    
    def unsubscribe(self,topic):
        if topic in ROSManager._subscribers:
            
            subscriber = ROSManager._subscribers[topic]
            subscriber.unregister()
            
            del ROSManager._subscribers[topic]
            
        else:
            rospy.logwarn("Subscriber for topic {} not found.".format(topic))


    def sendgoal(self):
        client = actionlib.SimpleActionClient('move_base',MoveBaseAction)
        client.wait_for_server()
        print("Connesso")
        goal = MoveBaseGoal()
        goal.target_pose.header.frame_id = 'map'
        goal.target_pose.pose.position.x = 1
        goal.target_pose.pose.position.y = 1
        goal.target_pose.pose.orientation.w = 1
    
        client.send_goal(goal)
        print("Goal inviato aspetto il risultato")
        wait = client.wait_for_result()
        print(wait)
       # If the result doesn't arrive, assume the Server is not available
        if not wait:
            rospy.logerr("Action server not available!")
            rospy.signal_shutdown("Action server not available!")
        else:
        # Result of executing the action
            return client.get_result()
    
    def publish_to_node(self,topic, message_type, queue_size):
        if ROSManager._instance._node is not None:
           pub = rospy.Publisher(topic, message_type, queue_size=queue_size)
           return pub
        else:
            rospy.logwarn("ROS node is not initialized.")
    def publish_msg(self,pub,msg):
            pub.publish(msg)
            print("inviato")
            rospy.sleep(1)
           